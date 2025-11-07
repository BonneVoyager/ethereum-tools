const { BigNumber } = require("@ethersproject/bignumber");
const { entropyToMnemonic } = require("@ethersproject/hdnode");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");
const { randomBytes } = require("@ethersproject/random");
const { formatUnits, parseUnits } = require("@ethersproject/units");
const { Wallet } = require("@ethersproject/wallet");
const txDecoder = require("ethereum-tx-decoder");
const JSON5 = require("json5");
const InputDataDecoder = require("../index");

window.BigNumber = BigNumber;

/**
 * Utility helpers
 */

function ready(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

function $(selector) {
  return document.querySelector(selector);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function debounce(fn, delay = 150) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function removeTrailingZero(value) {
  if (typeof value !== "string") {
    value = String(value);
  }
  if (!value.includes(".")) {
    return value;
  }
  return value
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "")
    .replace(/\.$/, "");
}

function toPlainString(num) {
  return ("" + num).replace(/(-?)(\d*)\.?(\d+)e([+-]\d+)/, function (a, b, c, d, e) {
    return e < 0
      ? b + "0." + Array(1 - e - c.length).join(0) + c + d
      : b + c + d + Array(e - d.length + 1).join(0);
  });
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function stringifyBigNumbers(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stringifyBigNumbers);
  }
  if (obj && obj._hex) {
    return BigInt(obj._hex).toString();
  }
  if (obj && obj._isBigNumber) {
    return obj.toString();
  }
  if (typeof obj === "object" && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = stringifyBigNumbers(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

function updateQueryParams(next) {
  const url = new URL(window.location);
  Object.entries(next).forEach(([key, val]) => {
    url.searchParams.set(key, val);
  });
  window.history.pushState(null, "", url.toString());
}

/**
 * Input Data Decoder
 */

function initInputDataDecoder(services) {
  const abiInput = $("#abiInput");
  const dataInput = $("#dataInput");
  const output = $("#output");
  const decodeButton = $("#decode");
  const getAbiButton = $("#getAbi");

  if (!abiInput || !dataInput || !output || !decodeButton || !getAbiButton) {
    return;
  }

  const unitConverter = services.unitConverter;
  const timestampConverter = services.timestampConverter;

  function cleanInputData(value) {
    return value.trim().replace(/(?:[\s\S]*MethodID: (.*)[\s\S])?[\s\S]?\[\d\]:(.*)/gi, "$1$2");
  }

  function decode() {
    output.value = "";
    try {
      const abi = JSON.parse(abiInput.value.trim());
      const decoder = new InputDataDecoder(abi);
      const data = cleanInputData(dataInput.value);
      dataInput.value = data;
      const result = decoder.decodeData(data);
      result.inputs = stringifyBigNumbers(result.inputs);
      output.value = formatJson(result);
    } catch (error) {
      output.value = "Invalid ABI or Input Data";
    }
  }

  const debouncedDecode = debounce(decode, 100);

  decodeButton.addEventListener("click", (event) => {
    event.preventDefault();
    decode();
  });

  abiInput.addEventListener("input", debouncedDecode);
  dataInput.addEventListener("input", debouncedDecode);

  output.addEventListener("click", () => {
    const selected = output.value.substring(output.selectionStart, output.selectionEnd);
    if (!selected || selected.startsWith("0x") || !/^\d+$/.test(selected)) {
      return;
    }

    const asNumber = Number(selected);
    if (selected.length === 10 && Number.isFinite(asNumber) && asNumber > 0) {
      timestampConverter.setTimestamp(asNumber, { persist: true });
      return;
    }

    try {
      unitConverter.setWeiValue(BigNumber.from(selected), { persist: true });
    } catch (ex) {
      // Ignore invalid selections
    }
  });

  async function fetchContract(contract) {
    const response = await fetch(
      `https://api.etherscan.io/api?module=contract&action=getabi&address=${contract}`
    );
    const json = await response.json();
    if (json.status !== "1") {
      throw new Error("Invalid Etherscan status");
    }
    abiInput.value = formatJson(JSON.parse(json.result));
    decode();
  }

  getAbiButton.addEventListener("click", async () => {
    const contract = prompt("Enter contract address:");
    if (!contract) return;
    try {
      await fetchContract(contract.trim());
      updateQueryParams({ contract: contract.trim() });
    } catch (error) {
      alert("Could not fetch contract ABI from Etherscan");
    }
  });

  const initContract = new URLSearchParams(window.location.search).get("contract");
  if (initContract) {
    fetchContract(initContract).catch(() => {});
  } else {
    decode();
  }
}

/**
 * Unit Converter
 */

function createUnitConverter() {
  const baseUnitsInput = $("#base-units");
  const tokenUnitsInput = $("#unit-custom");
  const decimalsInput = $("#unit-decimals");

  if (!baseUnitsInput || !tokenUnitsInput || !decimalsInput) {
    return {
      setWeiValue: () => {},
    };
  }

  const DECIMALS = {
    MIN: 0,
    MAX: 30,
    DEFAULT: 18,
  };

  function sanitizeDecimals(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return null;
    return clamp(parsed, DECIMALS.MIN, DECIMALS.MAX);
  }

  function parseInput(value, unit) {
    const normalized = value === "" ? "0" : value;
    return BigNumber.from(parseUnits(toPlainString(normalized), unit));
  }

  function formatValue(value, unit) {
    return removeTrailingZero(formatUnits(value, unit));
  }

  const params = new URL(window.location).searchParams;
  const initialValue = params.get("unit")
    ? BigNumber.from(params.get("unit"))
    : parseUnits("1", "ether");
  const initialDecimals = sanitizeDecimals(params.get("unitDecimals")) ?? DECIMALS.DEFAULT;

  const state = {
    value: initialValue,
    decimals: initialDecimals,
  };

  decimalsInput.value = state.decimals;

  function updateInputs(value, { persist = true } = {}) {
    try {
      if (value.isNegative()) throw new Error("Negative value");
      state.value = value;
      baseUnitsInput.value = formatValue(value, "wei");
      tokenUnitsInput.value = formatValue(value, state.decimals);
      if (persist) {
        updateQueryParams({
          unit: value.toString(),
          unitDecimals: state.decimals,
        });
      }
    } catch (error) {
      baseUnitsInput.value = "0";
      tokenUnitsInput.value = "0";
    }
  }

  function readTokenUnits(decimalsOverride) {
    if (tokenUnitsInput.value === "") {
      return null;
    }
    try {
      return parseInput(tokenUnitsInput.value, decimalsOverride ?? state.decimals);
    } catch (error) {
      return null;
    }
  }

  baseUnitsInput.addEventListener("input", () => {
    try {
      const value = parseInput(baseUnitsInput.value, "wei");
      updateInputs(value);
    } catch (error) {}
  });

  tokenUnitsInput.addEventListener("input", () => {
    const value = readTokenUnits();
    if (value) {
      updateInputs(value);
    }
  });

  decimalsInput.addEventListener("input", () => {
    const sanitized = sanitizeDecimals(decimalsInput.value);
    if (sanitized === null) return;
    if (decimalsInput.value !== sanitized.toString()) {
      decimalsInput.value = sanitized;
    }
    state.decimals = sanitized;
    const derivedValue = readTokenUnits(sanitized) || state.value;
    updateInputs(derivedValue);
  });

  decimalsInput.addEventListener("blur", () => {
    if (decimalsInput.value === "") {
      decimalsInput.value = DECIMALS.DEFAULT;
      state.decimals = DECIMALS.DEFAULT;
      const derivedValue = readTokenUnits(DECIMALS.DEFAULT) || state.value;
      updateInputs(derivedValue);
    }
  });

  updateInputs(state.value, { persist: false });

  return {
    setWeiValue(value, options) {
      updateInputs(BigNumber.from(value), options);
    },
  };
}

/**
 * Timestamp Converter
 */

function createTimestampConverter() {
  const timestampInput = $("#timestamp");
  const dateInput = $("#date");
  const localeInput = $("#localeDate");

  if (!timestampInput || !dateInput || !localeInput) {
    return {
      setTimestamp: () => {},
    };
  }

  const params = new URL(window.location).searchParams;
  const initialValue = params.get("timestamp")
    ? Number(params.get("timestamp"))
    : Math.ceil(Date.now() / 1000);

  function render(value, { persist = true } = {}) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }
    const jsTimestamp = numericValue * 1000;
    timestampInput.value = numericValue;
    dateInput.value = new Date(jsTimestamp).toISOString().replace("T", " ").replace(".000Z", "");
    const offset = new Date().getTimezoneOffset() * 60 * 1000;
    localeInput.value = new Date(jsTimestamp - offset).toISOString().substring(0, 16);
    if (persist) {
      updateQueryParams({ timestamp: numericValue });
    }
  }

  timestampInput.addEventListener("input", () => {
    const value = parseInt(timestampInput.value, 10);
    if (Number.isFinite(value)) {
      render(value);
    }
  });

  localeInput.addEventListener("input", () => {
    const value = new Date(localeInput.value).getTime() / 1000;
    if (Number.isFinite(value)) {
      render(value);
    }
  });

  render(initialValue, { persist: false });

  return {
    setTimestamp(value, options) {
      render(value, options);
    },
  };
}

/**
 * Hexadecimal Converter
 */

function initHexConverter() {
  const hexInput = $("#hexadecimal");
  const decimalInput = $("#decimal");
  const ethInput = $("#hexadecimal-eth");

  if (!hexInput || !decimalInput || !ethInput) {
    return;
  }

  const params = new URL(window.location).searchParams;
  const initialValue = params.get("hexadecimal") || parseUnits("1", "ether");

  function render(value) {
    const bnValue = BigNumber.from(value);
    hexInput.value = bnValue.toHexString();
    decimalInput.value = bnValue.toString();
    ethInput.value = formatUnits(value, "ether");
    updateQueryParams({ hexadecimal: bnValue.toHexString() });
  }

  hexInput.addEventListener("input", () => {
    try {
      render(BigNumber.from(hexInput.value).toString());
    } catch (error) {}
  });

  decimalInput.addEventListener("input", () => {
    try {
      render(BigNumber.from(decimalInput.value).toString());
    } catch (error) {}
  });

  render(initialValue);
}

/**
 * Random Account Generator
 */

function initRandomAccount() {
  const addressInput = $("#account-address");
  const privateKeyInput = $("#account-private-key");
  const mnemonicInput = $("#account-mnemonic");

  if (!addressInput || !privateKeyInput || !mnemonicInput) {
    return;
  }

  const entropy = randomBytes(32);
  const mnemonic = entropyToMnemonic(entropy);
  const wallet = Wallet.fromMnemonic(mnemonic);

  addressInput.value = wallet.address;
  privateKeyInput.value = wallet.privateKey;
  mnemonicInput.value = mnemonic;
}

/**
 * Keccak-256 Hasher
 */

function initKeccakHasher() {
  const input = $("#keccak256-input");
  const output = $("#keccak256-output");

  if (!input || !output) {
    return;
  }

  input.addEventListener("input", () => {
    try {
      output.value = keccak256(toUtf8Bytes(input.value));
    } catch (error) {
      output.value = "Invalid Input";
    }
  });
}

/**
 * Transaction Decoder
 */

function initTransactionDecoder() {
  const transactionInput = $("#transaction");
  const decodedOutput = $("#decoded");

  if (!transactionInput || !decodedOutput) {
    return;
  }

  const updateDecoded = () => {
    try {
      const decoded = txDecoder.decodeTx(transactionInput.value.trim());
      decodedOutput.value = formatJson(stringifyBigNumbers(decoded));
    } catch (error) {
      decodedOutput.value = "Invalid transaction";
    }
  };

  transactionInput.addEventListener("input", updateDecoded);
}

/**
 * JSON5 Parser
 */

function initJsonParser() {
  const jsonInput = $("#json");
  const parsedOutput = $("#parsed");

  if (!jsonInput || !parsedOutput) {
    return;
  }

  const updateParsed = () => {
    try {
      parsedOutput.value = formatJson(JSON5.parse(jsonInput.value.trim()));
    } catch (error) {
      parsedOutput.value = "Invalid JSON";
    }
  };

  jsonInput.addEventListener("input", debounce(updateParsed, 150));
}

/**
 * Collapsible Sections
 */

function initSectionCollapsers() {
  const sections = [
    { header: "input-data-decoder-collapse", container: "input-data-decoder", storage: "decoder-collapsed", label: "Ethereum Input Data Decoder" },
    { header: "unit-converter-collapse", container: "unit-converter", storage: "unit-collapsed", label: "Ethereum Unit Converter" },
    { header: "timestamp-converter-collapse", container: "timestamp-converter", storage: "timestamp-collapsed", label: "Timestamp Date Converter" },
    { header: "hexadecimal-converter-collapse", container: "hexadecimal-converter", storage: "hexadecimal-collapsed", label: "Hexadecimal Converter" },
    { header: "random-account-collapse", container: "random-account", storage: "random-account-collapsed", label: "Random Ethereum Account" },
    { header: "keccak256-hasher-collapse", container: "keccak256-hasher", storage: "keccak256-collapsed", label: "Keccak256 Hasher" },
    { header: "tx-decoder-collapse", container: "tx-decoder", storage: "tx-decoder", label: "Transaction Decoder" },
    { header: "json-parser-collapse", container: "json-parser", storage: "json-parser", label: "JSON5 Parser" },
  ];

  sections.forEach(({ header, container, storage, label }) => {
    const headerEl = document.getElementById(header);
    const containerEl = document.getElementById(container);
    if (!headerEl || !containerEl || !containerEl.parentNode) {
      return;
    }

    const parentSection = containerEl.parentNode;
    const applyState = (collapsed) => {
      parentSection.classList.toggle("collapsed", collapsed);
      headerEl.innerText = `${label} ${collapsed ? "" : ""}`;
    };

    headerEl.addEventListener("click", () => {
      const collapsed = !parentSection.classList.contains("collapsed");
      applyState(collapsed);
      localStorage.setItem(storage, collapsed);
    });

    if (localStorage.getItem(storage) === "true") {
      applyState(true);
    }
  });
}

ready(() => {
  const unitConverter = createUnitConverter();
  const timestampConverter = createTimestampConverter();

  initInputDataDecoder({ unitConverter, timestampConverter });
  initHexConverter();
  initRandomAccount();
  initKeccakHasher();
  initTransactionDecoder();
  initJsonParser();
  initSectionCollapsers();
});
