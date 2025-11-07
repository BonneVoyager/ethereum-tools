const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");
const { $ } = require("./helpers");

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

module.exports = initKeccakHasher;
