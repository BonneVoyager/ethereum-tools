const JSON5 = require("json5");
const { $, debounce, formatJson } = require("./helpers");

function initJsonParser() {
  const jsonInput = $("#json");
  const parsedOutput = $("#parsed");

  if (!jsonInput || !parsedOutput) {
    return;
  }

  const updateParsed = () => {
    try {
      parsedOutput.value = formatJson(JSON5.parse(jsonInput.value.trim()));
    } catch (error) {
      parsedOutput.value = "Invalid JSON";
    }
  };

  jsonInput.addEventListener("input", debounce(updateParsed, 150));
}

module.exports = initJsonParser;
