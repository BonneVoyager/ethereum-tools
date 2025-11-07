const { entropyToMnemonic } = require("@ethersproject/hdnode");
const { randomBytes } = require("@ethersproject/random");
const { Wallet } = require("@ethersproject/wallet");
const { $ } = require("./helpers");

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

module.exports = initRandomAccount;
