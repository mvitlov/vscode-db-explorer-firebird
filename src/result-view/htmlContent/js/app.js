$(document).ready(() => {
  const vscode = acquireVsCodeApi();

  vscode.postMessage({
    command: "getData",
    data: {}
  });

  window.addEventListener("message", event => {
    const data = event.data.data;
    renderExecutionStats(data.execution);

    if (data.tableBody.length) {
      $("#zero-results").hide();
      showData(data);
    } else {
      $("#zero-results").show();
      $("body").addClass("loaded");
    }
  });
});

function setStatsValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatMilliseconds(value) {
  return `${value} ms`;
}

function renderExecutionStats(execution) {
  if (!execution) {
    setStatsValue("stats-rows", "-");
    setStatsValue("stats-total", "-");
    setStatsValue("stats-connect", "-");
    setStatsValue("stats-fetch", "-");
    setStatsValue("stats-blob", "-");
    setStatsValue("stats-sql", "-");
    return;
  }

  setStatsValue("stats-rows", `${execution.rowCount}`);
  setStatsValue("stats-total", formatMilliseconds(execution.totalMs));
  setStatsValue("stats-connect", formatMilliseconds(execution.connectMs));
  setStatsValue("stats-fetch", formatMilliseconds(execution.fetchMs));
  setStatsValue("stats-blob", formatMilliseconds(execution.blobDecodeMs));
  setStatsValue("stats-sql", execution.sqlPreview || "-");
}

function showData(data) {
  $("#example").DataTable({
    scrollX: true,
    iDisplayLength: data.recordsPerPage == "All records" ? -1 : parseInt(data.recordsPerPage),
    columns: data.tableHeader,
    data: data.tableBody,
    order: [],
    dom: "Bfrtip",
    buttons: [
      "pageLength",
      {
        extend: "collection",
        text: "Export data",
        autoClose: true,
        buttons: [
          {
            text: "as JSON",
            action: function(e, dt, button, config) {
              var data = dt.buttons.exportData();
              $.fn.dataTable.fileSave(new Blob([JSON.stringify(data)]), "Export.json");
            },
            title: "Data export",
            titleAttr: "Export data to .json (JavaScript Object Notation) file."
          },
          {
            extend: "csv",
            text: "as CSV",
            title: "Data export",
            titleAttr: "Export data to .csv (Comma-Separated Value) file."
          },
          {
            extend: "excel",
            text: "as XLSX",
            title: "Data export",
            titleAttr: "Export data to .xlsx (Excel Workbook) file."
          },
          {
            extend: "pdf",
            text: "as PDF",
            title: "Data export",
            titleAttr: "Export data to .pdf (Portable Document Format) file."
          }
        ]
      }
    ],
    lengthMenu: [[10, 25, 50, 100, -1], ["10 rows", "25 rows", "50 rows", "100 rows", "Show all"]]
  });
  $("body").addClass("loaded");
}
