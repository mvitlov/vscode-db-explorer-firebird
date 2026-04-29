const vscode = acquireVsCodeApi();
const previousState = vscode.getState() || {};

const DEFAULT_FILTER_OPERATOR = "contains";
const FILTER_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not equal" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "regex", label: "RegExp" }
];

let gridApi;
let runtimeState = {
  data: null,
  wrapCells: previousState.wrapCells === true,
  compactRows: previousState.compactRows !== false,
  columnWidths: previousState.columnWidths || {},
  columnFilters: {}
};

// Detect if a value looks like a boolean
function isBooleanValue(value) {
  if (value === "__FIREBIRD_NULL__" || value == null) return false;
  const str = String(value).toLowerCase().trim();
  return str === "true" || str === "false";
}

// Format boolean value as visual indicator
function formatBoolean(value) {
  const str = String(value).toLowerCase().trim();
  const isTrue = str === "true";
  return {
    icon: isTrue ? "✓" : "✗",
    text: str,
    className: isTrue ? "cell-bool-true" : "cell-bool-false"
  };
}

// Initialize AG Grid when document is ready
document.addEventListener("DOMContentLoaded", () => {
  // Wait for agGrid to be available
  const waitForAgGrid = setInterval(() => {
    if (typeof agGrid !== "undefined" && agGrid.createGrid) {
      clearInterval(waitForAgGrid);
      bindUi();
      vscode.postMessage({
        command: "getData",
        data: {}
      });

      window.addEventListener("message", event => {
        runtimeState.data = event.data.data;
        renderView();
        persistState();
      });
    }
  }, 50);

  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(waitForAgGrid);
    if (typeof agGrid === "undefined") {
      console.error("AG Grid failed to load from CDN");
      document.body.classList.add("loaded");
      document.getElementById("empty-state").removeAttribute("hidden");
    }
  }, 5000);
});

function bindUi() {
  const copySql = document.getElementById("copy-sql");
  if (copySql) {
    copySql.addEventListener("click", function() {
      const sql = runtimeState.data && runtimeState.data.execution ? runtimeState.data.execution.sql : "";
      copyToClipboard(sql);
    });
  }
}

function renderView() {
  const data = runtimeState.data || {
    tableHeader: [],
    tableBody: [],
    execution: null,
    summary: { rowCount: 0, columnCount: 0 }
  };

  syncBodyClasses();
  syncToggleLabels();
  renderHeader(data);
  renderExecutionStats(data);
  renderSqlStrip(data);

  if (!data.tableBody.length) {
    destroyGrid();
    const tableShell = document.getElementById("table-shell");
    const emptyState = document.getElementById("empty-state");
    if (tableShell) tableShell.setAttribute("hidden", "true");
    if (emptyState) emptyState.removeAttribute("hidden");
    document.body.classList.add("loaded");
    return;
  }

  const tableShell = document.getElementById("table-shell");
  const emptyState = document.getElementById("empty-state");
  if (emptyState) emptyState.setAttribute("hidden", "true");
  if (tableShell) tableShell.removeAttribute("hidden");

  // Check if AG Grid is available
  if (typeof agGrid === "undefined" || !agGrid.createGrid) {
    console.error("AG Grid not available, showing error");
    if (tableShell) tableShell.setAttribute("hidden", "true");
    if (emptyState) {
      emptyState.removeAttribute("hidden");
      emptyState.querySelector("h2").textContent = "AG Grid Failed to Load";
      emptyState.querySelector("p").textContent = "The data grid library failed to load. Please try refreshing the page.";
    }
    document.body.classList.add("loaded");
    return;
  }

  showData(data);
  document.body.classList.add("loaded");
}

function renderHeader(data) {
  const summary = data.summary || {};
  const titleParts = [];

  if (summary.database) {
    titleParts.push(summary.database);
  }
  if (summary.host) {
    titleParts.push(summary.host);
  }

  const titleEl = document.getElementById("panel-title");
  if (titleEl) {
    titleEl.textContent = titleParts.length ? titleParts.join(" • ") : "Result grid";
  }

  const subtitleParts = [];
  if (summary.executedAt) {
    subtitleParts.push(summary.executedAt);
  }

  const subtitleEl = document.getElementById("panel-subtitle");
  if (subtitleEl) {
    subtitleEl.textContent = subtitleParts.join(" • ") || "Run a query to inspect rows here.";
  }
}

function renderExecutionStats(data) {
  const execution = data.execution || {};
  const summary = data.summary || {};
  const stats = [
    { label: "Rows", value: safeValue(summary.rowCount) },
    { label: "Columns", value: safeValue(summary.columnCount) },
    { label: "Total", value: execution.totalMs != null ? formatMilliseconds(execution.totalMs) : "-" },
    { label: "Connect", value: execution.connectMs != null ? formatMilliseconds(execution.connectMs) : "-" },
    { label: "Execute", value: execution.executeMs != null ? formatMilliseconds(execution.executeMs) : "-" },
    { label: "Fetch", value: execution.fetchMs != null ? formatMilliseconds(execution.fetchMs) : "-" },
    { label: "Blob", value: execution.blobDecodeMs != null ? formatMilliseconds(execution.blobDecodeMs) : "-" }
  ];

  const html = stats
    .map(stat => `
      <div class="stats-item">
        <span class="stats-label">${escapeHtml(stat.label)}</span>
        <span class="stats-value">${escapeHtml(stat.value)}</span>
      </div>
    `)
    .join("");

  const statsEl = document.getElementById("query-stats");
  if (statsEl) {
    statsEl.innerHTML = html;
  }
}

function renderSqlStrip(data) {
  const sql = data && data.execution ? data.execution.sqlPreview || data.execution.sql || "" : "";
  const sqlStripEl = document.getElementById("sql-strip");
  const sqlPreviewEl = document.getElementById("sql-preview");

  if (!sql) {
    if (sqlStripEl) sqlStripEl.setAttribute("hidden", "true");
    if (sqlPreviewEl) sqlPreviewEl.textContent = "";
    return;
  }

  if (sqlStripEl) sqlStripEl.removeAttribute("hidden");
  if (sqlPreviewEl) sqlPreviewEl.textContent = sql;
}

function showData(data) {
  destroyGrid();
  runtimeState.columnFilters = {};

  // Prepare rowData by converting array of arrays to objects
  const rowData = data.tableBody.map((row, rowIndex) => {
    const rowObj = { _rowIndex: rowIndex };
    data.tableHeader.forEach((header, colIndex) => {
      rowObj[`col_${colIndex}`] = row[colIndex];
    });
    return rowObj;
  });

  const columnDefs = [
    {
      headerName: "#",
      field: "_rowIndex",
      width: 44,
      pinned: "left",
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: "ag-cell-row-index",
      valueGetter: (params) => params.node.rowIndex + 1
    }
  ].concat(
    data.tableHeader.map((column, index) => {
      const colKey = `col_${index}`;
      return {
        headerName: escapeHtml(column.title),
        field: colKey,
        cellRenderer: (params) => {
          const cellValue = params.value;
          const container = document.createElement("div");
          
          if (cellValue === "__FIREBIRD_NULL__") {
            container.className = "cell-null";
            container.innerHTML = '<span class="null-badge">NULL</span>';
            container.title = "NULL";
          } else {
            const text = cellValue == null ? "" : String(cellValue);
            const maxLength = runtimeState.data?.maxCellPreviewLength || 120;
            
            // Check for boolean values
            if (isBooleanValue(text)) {
              const boolFormat = formatBoolean(text);
              container.className = `cell-preview cell-boolean ${boolFormat.className}`;
              container.innerHTML = `<span class="bool-icon">${boolFormat.icon}</span><span class="bool-text">${escapeHtml(boolFormat.text)}</span>`;
              container.title = text;
            } 
            // Check for numeric zero (apply transparency)
            else if (text === "0" || text === "0.0" || text === "0.00") {
              container.className = "cell-preview cell-zero";
              container.textContent = text;
              container.title = text;
            }
            // Regular text with truncation
            else {
              const shouldClamp = text.length > maxLength;
              const displayText = shouldClamp ? `${text.slice(0, maxLength - 1)}…` : text;
              container.className = `cell-preview ${runtimeState.wrapCells ? "wrap" : ""}`;
              container.textContent = displayText;
              container.title = text;
            }
          }
          
          return container;
        },
        autoHeight: runtimeState.wrapCells,
        wrapText: runtimeState.wrapCells,
        filter: "agTextColumnFilter",
        filterParams: {
          filterOptions: ["contains", "equals", "startsWith", "endsWith"],
          debounceMs: 200,
          suppressAndOrCondition: true
        },
        resizable: true,
        sortable: true,
        comparator: (valueA, valueB) => {
          // Handle null/empty values
          if (valueA === "__FIREBIRD_NULL__" || valueA == null) valueA = "";
          if (valueB === "__FIREBIRD_NULL__" || valueB == null) valueB = "";

          valueA = String(valueA).trim();
          valueB = String(valueB).trim();

          // Try to parse as numbers
          const numA = parseFloat(valueA);
          const numB = parseFloat(valueB);

          // Check if both are valid numbers
          if (!isNaN(numA) && !isNaN(numB) && valueA !== "" && valueB !== "") {
            return numA - numB;
          }

          // Fall back to string comparison
          return valueA.localeCompare(valueB);
        }
      };
    })
  );

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: rowData,
    enableCellTextSelection: true,
    suppressScrollOnNewData: false,
    suppressAnimationFrame: false,
    rowHeight: runtimeState.compactRows ? 28 : 32,
    headerHeight: 40,
    floatingFiltersHeight: 40,
    // enableRowGroup: true,
    // enableGroupEdit:true,
    // enableRowPinning:true,
    // onRowGroupOpened:true,
    // enableCellSpan:true,
    // enableRangeHandle:true,
    // enableRtl:true,
    // groupRowRenderer:true,
    // enableCharts:true,
    defaultColDef: {
      resizable: true,
      editable: true,
      sortable: true,
      filter: true
    },
    onGridReady: onGridReady,
    onColumnResized: onColumnResized,
    suppressMultiSort: false,
    pagination: true,
    paginationPageSize: data.recordsPerPage === "All records" ? -1 : parseInt(data.recordsPerPage, 50) || 50,
    paginationPageSizeSelector: [50, 100, 500, 1000],
    suppressPaginationPanel: false,
    quickFilterText: "",
  };

  const container = document.getElementById("ag-grid-container");
  if (container && typeof agGrid !== "undefined" && agGrid.createGrid) {
    try {
      const existingGrid = container.querySelector(".ag-root");
      if (existingGrid) {
        existingGrid.remove();
      }

      const gridDiv = document.createElement("div");
      gridDiv.style.height = "100%";
      gridDiv.style.width = "100%";
      gridDiv.className = "ag-theme-custom";
      container.appendChild(gridDiv);

      gridApi = agGrid.createGrid(gridDiv, gridOptions);

      applyStoredColumnWidths();
      addExportButtons();
      addCsvActions();
    } catch (error) {
      console.error("Failed to create AG Grid:", error);
      destroyGrid();
    }
  } else {
    console.error("AG Grid container or library not available");
  }
}

function onGridReady(params) {
  gridApi = params.api;

  if (runtimeState.columnWidths) {
    applyStoredColumnWidths();
  }
}

function onColumnResized(params) {
  if (!params.finished) {
    return;
  }

  const columns = params.api ? params.api.getColumns() : (params.columnApi ? params.columnApi.getColumns() : gridApi.getColumns());
  if (columns) {
    columns.forEach((col, index) => {
      const width = col.getActualWidth();
      if (width) {
        runtimeState.columnWidths[index] = width;
      }
    });
  }

  persistState();
}

function applyStoredColumnWidths() {
  if (!gridApi) {
    return;
  }

  const columns = gridApi.getColumns();
  if (columns) {
    columns.forEach((col, index) => {
      const storedWidth = runtimeState.columnWidths[index];
      if (storedWidth && gridApi.setColumnWidths) {
        gridApi.setColumnWidths([{ key: col.getColId(), newWidth: storedWidth }]);
      }
    });
  }
}

function addExportButtons() {
  const container = document.getElementById("datatable-actions");
  if (!container) {
    return;
  }

  container.innerHTML = "";

  // Hide the toolbar when there are no actions
  const toolbar = document.querySelector(".results-toolbar");
  if (toolbar) {
    toolbar.style.display = "none";
  }
}

function addCsvActions() {
  const container = document.getElementById("csv-actions");
  if (!container || !gridApi) {
    return;
  }

  container.innerHTML = "";

  const btnCsvDownload = document.createElement("button");
  btnCsvDownload.className = "csv-action-button";
  btnCsvDownload.type = "button";
  btnCsvDownload.title = "Download as CSV";
  btnCsvDownload.innerHTML = "⬇️ CSV";
  btnCsvDownload.addEventListener("click", () => {
    gridApi.exportDataAsCsv();
  });

  const btnCsvCopy = document.createElement("button");
  btnCsvCopy.className = "csv-action-button";
  btnCsvCopy.type = "button";
  btnCsvCopy.title = "Copy as CSV";
  btnCsvCopy.innerHTML = "📋 CSV";
  btnCsvCopy.addEventListener("click", () => {
    buildAndCopyCsv();
  });

  container.appendChild(btnCsvDownload);
  container.appendChild(btnCsvCopy);
}

function buildAndCopyCsv() {
  if (!gridApi || !runtimeState.data) {
    return;
  }

  const headers = runtimeState.data.tableHeader.map(h => h.title);
  const rows = runtimeState.data.tableBody;

  // Build CSV
  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ...rows.map(row => row.map(cell => {
      if (cell === "__FIREBIRD_NULL__") return "";
      const value = String(cell).replace(/"/g, '""');
      return /[,"\n]/g.test(value) ? `"${value}"` : value;
    }).join(","))
  ].join("\n");

  copyToClipboard(csvContent);
  showCopyFeedback();
}

function destroyGrid() {
  if (gridApi) {
    gridApi.destroy();
    gridApi = null;
  }

  const container = document.getElementById("ag-grid-container");
  if (container) {
    container.innerHTML = "";
  }
}

function buildJsonRows(headers, rows) {
  return rows.map(row => {
    const result = {};
    headers.forEach((header, index) => {
      const value = row[index];
      result[header.title] = value === "__FIREBIRD_NULL__" ? null : value;
    });
    return result;
  });
}

function syncBodyClasses() {
  document.body.classList.toggle("wrap-cells", runtimeState.wrapCells);
  document.body.classList.toggle("compact-rows", runtimeState.compactRows);
}

function syncToggleLabels() {
  // Removed toggle labels as wrap and compact toggles are no longer present
}

function persistState() {
  vscode.setState({
    wrapCells: runtimeState.wrapCells,
    compactRows: runtimeState.compactRows,
    columnWidths: runtimeState.columnWidths
  });
}

function formatMilliseconds(value) {
  return `${value} ms`;
}

function safeValue(value) {
  return value == null ? "-" : String(value);
}

function copyToClipboard(text) {
  if (!text) {
    return;
  }

  navigator.clipboard.writeText(text);
}

function showCopyFeedback() {
  // Create toast notification
  const toast = document.createElement("div");
  toast.className = "copy-feedback-toast";
  toast.innerHTML = "✓ Copied to clipboard";
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Remove after 2 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2000);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
