const { BigNumber } = require("@ethersproject/bignumber");
const { formatUnits, parseUnits } = require("@ethersproject/units");
const { $, clamp, removeTrailingZero, toPlainString, updateQueryParams } = require("./helpers");

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

function createUnitConverter() {
  const baseUnitsInput = $("#base-units");
  const tokenUnitsInput = $("#unit-custom");
  const decimalsInput = $("#unit-decimals");

  if (!baseUnitsInput || !tokenUnitsInput || !decimalsInput) {
    return {
      setWeiValue: () => {},
    };
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

module.exports = createUnitConverter;
