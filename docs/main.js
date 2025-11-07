const { BigNumber } = require("@ethersproject/bignumber");
const { entropyToMnemonic } = require("@ethersproject/hdnode");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");
const { randomBytes } = require("@ethersproject/random");
const { formatUnits, parseUnits } = require("@ethersproject/units");
const { Wallet } = require("@ethersproject/wallet");
const txDecoder = require("ethereum-tx-decoder");
const JSON5 = require("json5");

// Expose some abstraction to window

window.BigNumber = BigNumber;

// Input Decoder

const InputDataDecoder = require('../index');

const $abiInput = document.querySelector('#abiInput');
const $dataInput = document.querySelector('#dataInput');
const $output = document.querySelector('#output');
const $decode = document.querySelector('#decode');
const $getAbi = document.querySelector('#getAbi');

function stringifyBigNumbers(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stringifyBigNumbers);
  } else if (obj && obj._hex) {
    return BigInt(obj._hex).toString();
  } else if (obj && obj._isBigNumber) {
    return obj.toString();
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = stringifyBigNumbers(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

function decode() {
  $output.value = ''

  try {
    const abi = JSON.parse($abiInput.value.trim());
    const decoder = new InputDataDecoder(abi);
  
    // if copied and pasted from etherscan only get data we need
    const data = $dataInput.value.trim().replace(/(?:[\s\S]*MethodID: (.*)[\s\S])?[\s\S]?\[\d\]:(.*)/gi, '$1$2');
  
    $dataInput.value = data;
  
    const result = decoder.decodeData(data);
  
    console.log(result);
  
    result.inputs = stringifyBigNumbers(result.inputs);

    $output.value = JSON.stringify(result, null, 2);
  } catch(error) {
    $output.value = "Invalid ABI or Input Data";
  }
}

async function fetchContract(contract) {
  const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contract}`);
  const json = await response.json();
  if (json.status !== '1') throw new Error('Invalid Etherscan status');
  $abiInput.value = JSON.stringify(JSON.parse(json.result), null, 2);
  decode();
}

$decode.addEventListener('click', function(event) {
  event.preventDefault();
  decode();
});

$getAbi.addEventListener('click', async function() {
  const contract = prompt('Enter contract address:').trim();
  if (!contract) return;
  try {
    await fetchContract(contract);
    const url = new URL(window.location);
    url.searchParams.set('contract', contract);
    window.history.pushState(null, '', url.toString());
  } catch (ex) {
    alert('Could not fetch contract ABI from Etherscan');
  }
});

const initContract = new URLSearchParams(window.location.search).get('contract');
if (initContract) {
  fetchContract(initContract);
}

$output.addEventListener('click', function() {
  const selected = $output.value.substring($output.selectionStart, $output.selectionEnd);
  try {
    if (selected.startsWith('0x') || !/^\d/.test(selected)) return;
    if (selected.length === 10 && (new Date(parseInt(selected, 10))).getTime() > 0) {
      $timestamp.value = selected;
      setDateInputs(selected);
    } else {
      const value = BigNumber.from(selected);
      setConverterInputs(value);
    }
  } catch (ex) {}
})

$abiInput.addEventListener('input', function() {
  setTimeout(decode, 50);
});

$dataInput.addEventListener('input', function() {
  setTimeout(decode, 50);
});

// Unit Converter

const $baseUnits = document.querySelector('#base-units');
const $unitDecimals = document.querySelector('#unit-decimals');
const $unitCustom = document.querySelector('#unit-custom');

const searchUnit = new URL(window.location).searchParams.get('unit');
const unitInitValue = searchUnit ? BigNumber.from(searchUnit) : parseUnits('1', 'ether');
const searchUnitDecimals = new URL(window.location).searchParams.get('unitDecimals');
const DEFAULT_UNIT_DECIMALS = 18;

function sanitizeUnitDecimals(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  if (parsed < 0) return 0;
  if (parsed > 30) return 30;
  return parsed;
}

let activeUnitDecimals = sanitizeUnitDecimals(searchUnitDecimals);
if (activeUnitDecimals === null) {
  activeUnitDecimals = DEFAULT_UNIT_DECIMALS;
}

if ($unitDecimals) {
  $unitDecimals.value = activeUnitDecimals;
}

let lastUnitValue = unitInitValue;

function removeTrailingZero(value) {
  if (!value.includes('.')) {
    return value;
  }
  return value
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '')
    .replace(/\.$/, '');
}

function getUnitDecimals() {
  return activeUnitDecimals;
}

function setConverterInputs(value) {
  try {
    if (value.isNegative()) throw new Error('Negative value');
    lastUnitValue = value;
    if ($baseUnits) {
      $baseUnits.value = removeTrailingZero(formatUnits(value, 'wei'));
    }
    if ($unitCustom) {
      $unitCustom.value = removeTrailingZero(formatUnits(value, getUnitDecimals()));
    }

    const url = new URL(window.location);
    url.searchParams.set('unit', value);
    url.searchParams.set('unitDecimals', getUnitDecimals());
    window.history.pushState(null, '', url.toString());
  } catch (ex) {
    if ($baseUnits) {
      $baseUnits.value = 0;
    }
    if ($unitCustom) {
      $unitCustom.value = 0;
    }
  }
}

function toPlainString(num) { // this is to support scientific notation
  return ('' + num).replace(/(-?)(\d*)\.?(\d+)e([+-]\d+)/, function (a,b,c,d,e) {
    return e < 0
      ? b + '0.' + Array(1-e-c.length).join(0) + c + d
      : b + c + d + Array(e-d.length+1).join(0);
    }
  );
}

if ($baseUnits) {
  $baseUnits.addEventListener('input', function () {
    try {
      const value = BigNumber.from(parseUnits(toPlainString($baseUnits.value), 'wei'));
      setConverterInputs(value);
    } catch (ex) {}
  });
}
if ($unitCustom) {
  $unitCustom.addEventListener('input', function () {
    try {
      const inputValue = $unitCustom.value === '' ? '0' : $unitCustom.value;
      const value = BigNumber.from(parseUnits(toPlainString(inputValue), getUnitDecimals()));
      setConverterInputs(value);
    } catch (ex) {}
  });
}
  if ($unitDecimals) {
    $unitDecimals.addEventListener('input', function () {
      const sanitized = sanitizeUnitDecimals($unitDecimals.value);
      if (sanitized === null) return;
      if ($unitDecimals.value !== sanitized.toString()) {
        $unitDecimals.value = sanitized;
      }
      activeUnitDecimals = sanitized;

      let newValue = lastUnitValue;
      if ($unitCustom && $unitCustom.value !== '') {
        try {
          newValue = BigNumber.from(
            parseUnits(toPlainString($unitCustom.value), sanitized)
          );
        } catch (ex) {}
      }

      setConverterInputs(newValue);
    });
    $unitDecimals.addEventListener('blur', function () {
      if ($unitDecimals.value === '') {
        $unitDecimals.value = DEFAULT_UNIT_DECIMALS;
        activeUnitDecimals = DEFAULT_UNIT_DECIMALS;

        let newValue = lastUnitValue;
        if ($unitCustom && $unitCustom.value !== '') {
          try {
            newValue = BigNumber.from(
              parseUnits(toPlainString($unitCustom.value), activeUnitDecimals)
            );
          } catch (ex) {}
        }

        setConverterInputs(newValue);
      }
    });
  }

setConverterInputs(unitInitValue);

// Timestamp Converter

const $timestamp = document.querySelector('#timestamp');
const $date = document.querySelector('#date');
const $localeDate = document.querySelector('#localeDate');

const timestampUnit = new URL(window.location).searchParams.get('timestamp');
const timestampInitValue = timestampUnit ? BigNumber.from(timestampUnit) : Math.ceil(Date.now() / 1000);

function setDateInputs(timestamp) {
  const jsTimestamp = timestamp * 1000;
  $timestamp.value = timestamp;
  $date.value = new Date(jsTimestamp).toISOString().replace('T', ' ').replace('.000Z', '');

  const offset = new Date().getTimezoneOffset() * 1000 * 60;
  $localeDate.value = new Date(jsTimestamp - offset).toISOString().substring(0, 16);

  const url = new URL(window.location);
  url.searchParams.set('timestamp', timestamp);
  window.history.pushState(null, '', url.toString());
}

$timestamp.addEventListener('input', function () {
  try {
    const value = parseInt($timestamp.value, 10);
    setDateInputs(value);
  } catch (ex) {}
});
$localeDate.addEventListener('input', function () {
  try {
    const value = new Date($localeDate.value).getTime() / 1000;
    setDateInputs(value);
  } catch (ex) {}
});

$timestamp.value = timestampInitValue;
setDateInputs(timestampInitValue);

// Hexadecimals

const $hexadecimal = document.querySelector('#hexadecimal');
const $decimal = document.querySelector('#decimal');
const $hexadecimalEth = document.querySelector('#hexadecimal-eth');

const hexadecimalUnit = new URL(window.location).searchParams.get('hexadecimal');
const hexadecimalUnitInitValue = hexadecimalUnit ? hexadecimalUnit : parseUnits('1', 'ether');

function setHexadecimalInputs(value) {
  const bnBalue = BigNumber.from(value);
  $hexadecimal.value = bnBalue.toHexString();
  $decimal.value = bnBalue.toString();
  $hexadecimalEth.value = formatUnits(value, 'ether');

  const url = new URL(window.location);
  url.searchParams.set('hexadecimal', bnBalue.toHexString());
  window.history.pushState(null, '', url.toString());
}

$hexadecimal.addEventListener('input', function () {
  try {
    setHexadecimalInputs(BigNumber.from($hexadecimal.value).toString());
  } catch (ex) {}
});
$decimal.addEventListener('input', function () {
  try {
    setHexadecimalInputs(BigNumber.from($decimal.value).toString());
  } catch (ex) {}
});

setHexadecimalInputs(hexadecimalUnitInitValue);

// Random Ethereum Account

const $accountAddress = document.querySelector('#account-address');
const $accountPrivateKey = document.querySelector('#account-private-key');
const $accountMnemonic = document.querySelector('#account-mnemonic');

const randomBytes32 = randomBytes(32);
const mnemonic = entropyToMnemonic(randomBytes32);
const wallet = Wallet.fromMnemonic(mnemonic);

$accountAddress.value = wallet.address;
$accountPrivateKey.value = wallet.privateKey;
$accountMnemonic.value = mnemonic;

// Keccak-256

const $keccak256Input = document.querySelector('#keccak256-input');
const $keccak256Output = document.querySelector('#keccak256-output');

$keccak256Input.addEventListener('input', function () {
  try {
    $keccak256Output.value = keccak256(toUtf8Bytes($keccak256Input.value));
  } catch (ex) {
    console.warn(ex)
    $keccak256Output.value = 'Invalid Input';
  }
});

// Transaction decoder

const $transaction = document.querySelector('#transaction');
const $decoded = document.querySelector('#decoded');

$transaction.addEventListener('input', function () {
  try {
    console.warn(stringifyBigNumbers(txDecoder.decodeTx($transaction.value.trim())))
    $decoded.value = JSON.stringify(stringifyBigNumbers(txDecoder.decodeTx($transaction.value.trim())), null, 2);
  } catch (ex) {
    $decoded.value = 'Invalid transaction';
  }
});

// JSON parser

const $json = document.querySelector('#json');
const $parsed = document.querySelector('#parsed');

$json.addEventListener('input', function () {
  try {
    $parsed.value = JSON.stringify(JSON5.parse($json.value.trim()), null, 2);
  } catch (ex) {
    $parsed.value = 'Invalid JSON';
  }
});

// Collapse button

const $decoderCollapse = document.getElementById('input-data-decoder-collapse');
const $decoderContainer = document.getElementById('input-data-decoder');
$decoderCollapse.addEventListener('click', function() {
  $decoderContainer.parentNode.classList.toggle('collapsed');

  const isCollapsed = $decoderContainer.parentNode.classList.contains('collapsed');
  localStorage.setItem('decoder-collapsed', isCollapsed);
  $decoderCollapse.innerText = `Ethereum Input Data Decoder ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('decoder-collapsed') === 'true') {
  $decoderCollapse.click();
}

const $unitCollapse = document.getElementById('unit-converter-collapse');
const $unitContainer = document.getElementById('unit-converter');
$unitCollapse.addEventListener('click', function() {
  $unitContainer.parentNode.classList.toggle('collapsed');

  const isCollapsed = $unitContainer.parentNode.classList.contains('collapsed');
  localStorage.setItem('unit-collapsed', isCollapsed);
  $unitCollapse.innerText = `Ethereum Unit Converter ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('unit-collapsed') === 'true') {
  $unitCollapse.click();
}

const $timestampCollapse = document.getElementById('timestamp-converter-collapse');
const $timestampContainer = document.getElementById('timestamp-converter');
$timestampCollapse.addEventListener('click', function() {
  $timestampContainer.parentNode.classList.toggle('collapsed');

  const isCollapsed = $timestampContainer.parentNode.classList.contains('collapsed');
  localStorage.setItem('timestamp-collapsed', isCollapsed);
  $timestampCollapse.innerText = `Timestamp Date Converter ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('timestamp-collapsed') === 'true') {
  $timestampCollapse.click();
}

const $hexadecimalCollapse = document.getElementById('hexadecimal-converter-collapse');
const $hexadecimalContainer = document.getElementById('hexadecimal-converter');
$hexadecimalCollapse.addEventListener('click', function() {
  $hexadecimalContainer.parentNode.classList.toggle('collapsed');

  const isCollapsed = $hexadecimalContainer.parentNode.classList.contains('collapsed');
  localStorage.setItem('hexadecimal-collapsed', isCollapsed);
  $hexadecimalCollapse.innerText = `Hexadecimal Converter ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('hexadecimal-collapsed') === 'true') {
  $hexadecimalCollapse.click();
}

const $accountCollapse = document.getElementById('random-account-collapse');
const $accountContainer = document.getElementById('random-account');
$accountCollapse.addEventListener('click', function() {
  $accountContainer.parentNode.classList.toggle('collapsed');

  const isCollapsed = $accountContainer.parentNode.classList.contains('collapsed');
  localStorage.setItem('random-account-collapsed', isCollapsed);
  $accountCollapse.innerText = `Random Ethereum Account ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('random-account-collapsed') === 'true') {
  $accountCollapse.click();
}

const $keccak256Collapse = document.getElementById('keccak256-hasher-collapse');
const $keccak256Container = document.getElementById('keccak256-hasher');
$keccak256Collapse.addEventListener('click', function() {
  $keccak256Container.parentNode.classList.toggle('collapsed');

  const isCollapsed = $keccak256Container.parentNode.classList.contains('collapsed');
  localStorage.setItem('keccak256-collapsed', isCollapsed);
  $keccak256Collapse.innerText = `Keccak256 Hasher ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('keccak256-collapsed') === 'true') {
  $keccak256Collapse.click();
}

const $txDecoderCollapse = document.getElementById('tx-decoder-collapse');
const $txDecoderContainer = document.getElementById('tx-decoder');
$txDecoderCollapse.addEventListener('click', function() {
  $txDecoderContainer.parentNode.classList.toggle('collapsed');

  const isCollapsed = $txDecoderContainer.parentNode.classList.contains('collapsed');
  localStorage.setItem('tx-decoder', isCollapsed);
  $txDecoderCollapse.innerText = `Transaction Decoder ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('tx-decoder') === 'true') {
  $txDecoderCollapse.click();
}

const $jsonCollapse = document.getElementById('json-parser-collapse');
const $jsonContainer = document.getElementById('json-parser');
$jsonCollapse.addEventListener('click', function() {
  $jsonContainer.parentNode.classList.toggle('collapsed');

  const isCollapsed = $jsonContainer.parentNode.classList.contains('collapsed');
  localStorage.setItem('json-parser', isCollapsed);
  $jsonCollapse.innerText = `JSON5 Parser ${isCollapsed ? '' : ''}`
});
if (localStorage.getItem('json-parser') === 'true') {
  $jsonCollapse.click();
}
