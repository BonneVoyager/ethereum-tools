const txDecoder = require("ethereum-tx-decoder");
const { $, formatJson, stringifyBigNumbers } = require("./helpers");

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

module.exports = initTransactionDecoder;
