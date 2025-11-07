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

module.exports = {
  ready,
  $,
  clamp,
  debounce,
  removeTrailingZero,
  toPlainString,
  formatJson,
  stringifyBigNumbers,
  updateQueryParams,
};
