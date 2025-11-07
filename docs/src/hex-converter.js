const { BigNumber } = require("@ethersproject/bignumber");
const { formatUnits, parseUnits } = require("@ethersproject/units");
const { $, updateQueryParams } = require("./helpers");

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

module.exports = initHexConverter;
