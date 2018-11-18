$(document).ready(() => {
  const vscode = acquireVsCodeApi();

  vscode.postMessage({
    command: "getData",
    data: {}
  });

  window.addEventListener("message", event => {
    let data = event.data.data;
    if (data.tableBody.length) {
      $("#zero-results").hide();
      showData(data);
    } else {
      $("#zero-results").show();
      $("body").addClass("loaded");
    }
  });
});
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
