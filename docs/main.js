const { BigNumber } = require("@ethersproject/bignumber");
const InputDataDecoder = require("../index");

const {
  ready,
  $,
  debounce,
  formatJson,
  stringifyBigNumbers,
} = require("./src/helpers");
const createUnitConverter = require("./src/unit-converter");
const createTimestampConverter = require("./src/timestamp-converter");
const initHexConverter = require("./src/hex-converter");
const initRandomAccount = require("./src/random-account");
const initKeccakHasher = require("./src/keccak-hasher");
const initTransactionDecoder = require("./src/tx-decoder");
const initJsonParser = require("./src/json-parser");
const initSectionCollapsers = require("./src/collapsible");

window.BigNumber = BigNumber;

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
      // best effort: ignore invalid selections
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
      const url = new URL(window.location);
      url.searchParams.set("contract", contract.trim());
      window.history.pushState(null, "", url.toString());
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

ready(() => {
  const unitConverter = createUnitConverter();
  const timestampConverter = createTimestampConverter();

  initInputDataDecoder({ unitConverter, timestampConverter });
  initHexConverter();
  initRandomAccount();
  initKeccakHasher();
  initTransactionDecoder();
  initJsonParser();
  initSectionCollapsers([
    { header: "input-data-decoder-collapse", container: "input-data-decoder", storage: "decoder-collapsed", label: "Ethereum Input Data Decoder" },
    { header: "unit-converter-collapse", container: "unit-converter", storage: "unit-collapsed", label: "Unit Converter" },
    { header: "timestamp-converter-collapse", container: "timestamp-converter", storage: "timestamp-collapsed", label: "Timestamp Date Converter" },
    { header: "hexadecimal-converter-collapse", container: "hexadecimal-converter", storage: "hexadecimal-collapsed", label: "Hexadecimal Converter" },
    { header: "random-account-collapse", container: "random-account", storage: "random-account-collapsed", label: "Random Ethereum Account" },
    { header: "keccak256-hasher-collapse", container: "keccak256-hasher", storage: "keccak256-collapsed", label: "Keccak256 Hasher" },
    { header: "tx-decoder-collapse", container: "tx-decoder", storage: "tx-decoder", label: "Transaction Decoder" },
    { header: "json-parser-collapse", container: "json-parser", storage: "json-parser", label: "JSON5 Parser" },
  ]);
});
