// GLOBAL
let vscode, apiKey, tableName;

$(document).ready(() => {
  $("body").addClass("loaded");
  vscode = acquireVsCodeApi();
  vscode.postMessage({
    command: "getData",
    data: {}
  });
  window.addEventListener("message", event => {
    apiKey = event.data.data.apiKey;
    tableName = event.data.data.tableName;
    populateForm(event.data.data);
  });
});

$("#submit").click(function() {
  $("body").removeClass("loaded");
  if (!validateForm()) {
    handleError();
    return false;
  } else {
    generateRequest(parseForm());
  }
});

function handleError() {
  returnResult("error", "Please choose mock data type for each table field.");
}

// INITIALIZE AUTOCOMPLETE ON INPUT ELEMENT
function initAutoComplete(index) {
  $(`#autocomplete_${index}`).autocomplete({
    showNoSuggestionNotice: true,
    minChars: 0,
    lookup: dataTypes(index),
    groupBy: "category",
    onSelect: value => {
      $(`#mockDescription_${index}`).text(value.data.longDesc);
      setDataTypeOptions(index, value.data.options);
    },
    formatResult: (suggestion, currentValue) => {
      return (
        $.Autocomplete.defaults.formatResult(suggestion, currentValue) +
        " | " +
        "<small>" +
        suggestion.data.shortDesc +
        "</small>"
      );
    }
  });
}

// ADD/REMOVE THE DATA TYPE SPECIFIC OPTIONS
function setDataTypeOptions(index, options) {
  let row = $(`.row_options_${index}`);
  let html = "";
  if (options) {
    row.find(".column:not(:last)").remove();
    options.forEach(item => {
      html += `<div class="column">${item}</div>`;
    });
    $(`.row_options_${index}`).prepend(html);
  } else {
    row.find(".column:not(:last)").remove();
  }
}

// CONSTRUCT AN API URL REQUEST
function generateRequest(data) {
  const count = Number($("#countSelect").val());
  const query = encodeURIComponent(JSON.stringify(data));
  let url = `https://www.mockaroo.com/api/generate.sql?count=${count}&key=${apiKey}&fields=${query}`;

  getResults(url);
}

// GET RESULTS
function getResults(url) {
  $.ajax(url, {
    success: data => {
      data = data.replace(/insert into /g, `insert into ${tableName.trim()}`);
      returnResult("gotData", data);
    },
    error: (xhr, status, error) => {
      returnResult("error", error);
    }
  });
}

// SEND RESPONSE BACK TO VSCODE
function returnResult(command, result) {
  vscode.postMessage({
    command: command,
    data: result
  });
  $("body").addClass("loaded");
}
