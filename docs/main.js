const { BigNumber } = require("@ethersproject/bignumber");
const { formatUnits, parseUnits } = require("@ethersproject/units");

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

$decode.addEventListener('click', function(event) {
  event.preventDefault();
  decode();
});

$getAbi.addEventListener('click', async function() {
  const contract = prompt('Enter contract address');
  if (!contract) return;
  try {
    const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contract}`);
    const json = await response.json();
    if (json.status !== '1') throw new Error('Invalid Etherscan status');
    $abiInput.value = JSON.stringify(JSON.parse(json.result), null, 2);
  } catch (ex) {
    alert('Could not fetch contract ABI from Etherscan');
  }
});

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

const $wei = document.querySelector('#wei');
const $gwei = document.querySelector('#gwei');
const $ether = document.querySelector('#ether');

const unitInitValue = parseUnits('1', 'ether');

function removeTrailingZero(value) {
  const [number, decimal] = value.split('.');
  if (decimal === '0') {
    return number;
  }
  return value;
}

function setConverterInputs(value) {
  try {
    if (value.isNegative()) throw new Error('Negative value');
    $wei.value = removeTrailingZero(formatUnits(value, 'wei'));
    $gwei.value = removeTrailingZero(formatUnits(value, 'gwei'));
    $ether.value = removeTrailingZero(formatUnits(value, 'ether'));
  } catch (ex) {
    $wei.value = 0;
    $gwei.value = 0;
    $ether.value = 0;
  }
}

$wei.addEventListener('input', function () {
  const value = BigNumber.from(parseUnits($wei.value, 'wei'));
  setConverterInputs(value);
});
$gwei.addEventListener('input', function () {
  const value = BigNumber.from(parseUnits($gwei.value, 'gwei'));
  setConverterInputs(value);
});
$ether.addEventListener('input', function () {
  const value = BigNumber.from(parseUnits($ether.value, 'ether'));
  setConverterInputs(value);
});

setConverterInputs(unitInitValue);

// Timestamp Converter

const $timestamp = document.querySelector('#timestamp');
const $date = document.querySelector('#date');

const timestampInitValue = Math.ceil(Date.now() / 1000);

function setDateInputs(timestamp) {
  const jsTimestamp = timestamp * 1000;
  $date.value = new Date(jsTimestamp).toISOString().replace('T', ' ').replace('.000Z', '');
}

$timestamp.addEventListener('input', function () {
  const value = parseInt($timestamp.value, 10);
  setDateInputs(value);
});

$timestamp.value = timestampInitValue;
setDateInputs(timestampInitValue);
