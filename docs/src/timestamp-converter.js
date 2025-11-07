const { $, updateQueryParams } = require("./helpers");

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

module.exports = createTimestampConverter;
