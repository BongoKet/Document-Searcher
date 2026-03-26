"use strict";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  isSearching: false,
  results: [],      // all result rows (including error rows)
  scanned: 0,
  total: 0,
  resultCount: 0,
  errorCount: 0,
  sortKey: null,
  sortAsc: true,
  lastQuery: "",
};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const folderInput   = $("folderInput");
const queryInput    = $("queryInput");
const browseBtn     = $("browseBtn");
const searchBtn     = $("searchBtn");
const filterInput   = $("filterInput");
const clearBtn      = $("clearBtn");
const exportBtn     = $("exportBtn");

const statsBar      = $("statsBar");
const statScanned   = $("statScanned");
const statResults   = $("statResults");
const statErrors    = $("statErrors");

const progressSection = $("progressSection");
const progressBar     = $("progressBar");
const progressLabel   = $("progressLabel");

const resultsSection  = $("resultsSection");
const resultsTitle    = $("resultsTitle");
const resultsBody     = $("resultsBody");
const emptyState      = $("emptyState");
const errorToast      = $("errorToast");

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function basename(filePath) {
  return filePath.replace(/\\/g, "/").split("/").pop();
}

function dirname(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? filePath.slice(0, idx) : filePath;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightMatch(text, query, caseSensitive) {
  if (!query) return escapeHtml(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flags = caseSensitive ? "g" : "gi";
  const re = new RegExp(`(${escapedQuery})`, flags);
  return escapeHtml(text).replace(
    new RegExp(`(${escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, flags),
    "<mark>$1</mark>"
  );
}

function updateStats() {
  const pct = state.total > 0
    ? Math.round((state.scanned / state.total) * 100)
    : 0;
  statScanned.textContent  = `${state.scanned} / ${state.total} files`;
  statResults.textContent  = `${state.resultCount} result${state.resultCount !== 1 ? "s" : ""}`;
  statErrors.textContent   = state.errorCount > 0
    ? `${state.errorCount} error${state.errorCount !== 1 ? "s" : ""}`
    : "no errors";
  statErrors.style.color   = state.errorCount > 0 ? "var(--red)" : "";

  resultsTitle.textContent = `Results (${state.resultCount})`;
}

let toastTimer = null;
function showError(msg) {
  errorToast.textContent = msg;
  errorToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { errorToast.hidden = true; }, 6000);
}

// ---------------------------------------------------------------------------
// Row building
// ---------------------------------------------------------------------------

function buildResultRow(data) {
  const tr = document.createElement("tr");
  tr.dataset.file  = (data.file  || "").toLowerCase();
  tr.dataset.sheet = (data.sheet || "").toLowerCase();
  tr.dataset.cell  = (data.cell  || "").toLowerCase();
  tr.dataset.value = (data.value || "").toLowerCase();

  const highlighted = highlightMatch(
    data.value || "",
    state.lastQuery,
    $("optCaseSensitive").checked
  );

  tr.innerHTML = `
    <td title="${escapeHtml(data.file || "")}">
      <span class="cell-file" data-path="${escapeHtml(data.file || "")}">${escapeHtml(basename(data.file || ""))}</span>
      <span class="cell-dir">${escapeHtml(dirname(data.file || ""))}</span>
    </td>
    <td class="cell-sheet">${escapeHtml(data.sheet || "")}</td>
    <td class="cell-location">${escapeHtml(data.cell  || "")}</td>
    <td class="cell-value">${highlighted}</td>
    <td>
      <button class="open-btn" title="Open file" data-path="${escapeHtml(data.file || "")}">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3"/>
          <path d="M10 2h4v4"/>
          <line x1="14" y1="2" x2="8" y2="8"/>
        </svg>
      </button>
    </td>`;

  // Click filename to open
  tr.querySelector(".cell-file").addEventListener("click", () => {
    openFile(data.file);
  });
  tr.querySelector(".open-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openFile(data.file);
  });

  return tr;
}

function buildErrorRow(data) {
  const tr = document.createElement("tr");
  tr.classList.add("error-row");
  tr.dataset.file  = (data.file || "").toLowerCase();
  tr.dataset.sheet = "";
  tr.dataset.cell  = "";
  tr.dataset.value = "";

  tr.innerHTML = `
    <td title="${escapeHtml(data.file || "")}">
      <span class="cell-file">${escapeHtml(basename(data.file || ""))}</span>
      <span class="cell-dir">${escapeHtml(dirname(data.file || ""))}</span>
    </td>
    <td colspan="3" style="color:var(--red);">⚠ ${escapeHtml(data.error || "Unknown error")}</td>
    <td></td>`;

  return tr;
}

async function openFile(filePath) {
  if (!filePath) return;
  const err = await window.electronAPI.openFile(filePath);
  if (err) showError(`Could not open file: ${err}`);
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

function applyFilter() {
  const term = filterInput.value.toLowerCase().trim();
  const rows = resultsBody.querySelectorAll("tr");
  rows.forEach((tr) => {
    if (!term) {
      tr.classList.remove("hidden");
      return;
    }
    const hit =
      tr.dataset.file.includes(term)  ||
      tr.dataset.sheet.includes(term) ||
      tr.dataset.cell.includes(term)  ||
      tr.dataset.value.includes(term);
    tr.classList.toggle("hidden", !hit);
  });
}

filterInput.addEventListener("input", applyFilter);

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

document.querySelectorAll("thead th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (state.sortKey === key) {
      state.sortAsc = !state.sortAsc;
    } else {
      state.sortKey = key;
      state.sortAsc = true;
    }
    document.querySelectorAll("thead th").forEach((t) => t.classList.remove("sorted"));
    th.classList.add("sorted");
    th.querySelector(".sort-icon").textContent = state.sortAsc ? "↑" : "↓";

    const rows = Array.from(resultsBody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      const av = a.dataset[key] || "";
      const bv = b.dataset[key] || "";
      return state.sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    rows.forEach((r) => resultsBody.appendChild(r));
  });
});

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

exportBtn.addEventListener("click", () => {
  const rows = Array.from(resultsBody.querySelectorAll("tr:not(.error-row):not(.hidden)"));
  if (!rows.length) return;

  const csv = [
    ["File", "Directory", "Sheet / Section", "Cell / Location", "Matched Value"],
    ...rows.map((tr) => {
      const cells = tr.querySelectorAll("td");
      const file  = tr.querySelector(".cell-file")?.dataset.path || "";
      return [
        basename(file),
        dirname(file),
        cells[1]?.textContent || "",
        cells[2]?.textContent || "",
        cells[3]?.textContent || "",
      ];
    }),
  ]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url,
    download: `excel-search-results.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
});

// ---------------------------------------------------------------------------
// Search lifecycle
// ---------------------------------------------------------------------------

function setSearchingState(searching) {
  state.isSearching = searching;
  searchBtn.textContent = searching ? "Stop" : "Search";
  searchBtn.classList.toggle("stop", searching);
  browseBtn.disabled  = searching;
  folderInput.disabled = searching;
  queryInput.disabled  = searching;
}

function resetUI() {
  state.results    = [];
  state.scanned    = 0;
  state.total      = 0;
  state.resultCount = 0;
  state.errorCount  = 0;

  resultsBody.innerHTML = "";
  filterInput.value     = "";

  progressBar.style.width = "0%";
  progressBar.classList.add("indeterminate");
  progressLabel.textContent = "Counting files…";

  progressSection.hidden = false;
  resultsSection.hidden  = false;
  emptyState.hidden      = true;
  statsBar.hidden        = false;

  updateStats();
}

function finishSearch(label) {
  setSearchingState(false);
  progressBar.classList.remove("indeterminate");
  progressBar.style.width = "100%";
  progressLabel.textContent = label;
  updateStats();

  if (!state.resultCount && !state.errorCount) {
    resultsSection.hidden = true;
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent =
      "No matches found. Try a different search term or folder.";
  }
}

// ---------------------------------------------------------------------------
// IPC message handler
// ---------------------------------------------------------------------------

function handleSearchUpdate(msg) {
  switch (msg.type) {

    case "total":
      state.total = msg.total;
      progressBar.classList.remove("indeterminate");
      progressLabel.textContent = `Found ${msg.total} file${msg.total !== 1 ? "s" : ""} to scan…`;
      updateStats();
      break;

    case "progress":
      state.scanned = msg.scanned;
      if (state.total > 0) {
        progressBar.style.width = `${Math.round((msg.scanned / state.total) * 100)}%`;
      }
      progressLabel.textContent = `Scanning (${msg.scanned}/${state.total}): ${msg.file}`;
      updateStats();
      break;

    case "result": {
      state.resultCount++;
      const tr = buildResultRow(msg);
      state.results.push({ type: "result", ...msg });
      resultsBody.appendChild(tr);
      applyFilter();
      updateStats();
      break;
    }

    case "file_error": {
      state.errorCount++;
      const tr = buildErrorRow(msg);
      state.results.push({ type: "error", ...msg });
      resultsBody.appendChild(tr);
      applyFilter();
      updateStats();
      break;
    }

    case "done":
      finishSearch(
        `Done — scanned ${msg.scanned} file${msg.scanned !== 1 ? "s" : ""}, ` +
        `found ${state.resultCount} match${state.resultCount !== 1 ? "es" : ""}.`
      );
      break;

    case "stopped":
      finishSearch(`Search stopped at ${state.scanned} file${state.scanned !== 1 ? "s" : ""}.`);
      break;

    case "error":
      showError(msg.message || "An unknown error occurred.");
      finishSearch("Search failed.");
      break;
  }
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

browseBtn.addEventListener("click", async () => {
  const folder = await window.electronAPI.selectFolder();
  if (folder) folderInput.value = folder;
});

searchBtn.addEventListener("click", () => {
  if (state.isSearching) {
    window.electronAPI.stopSearch();
    return;
  }
  startSearch();
});

queryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startSearch();
});

clearBtn.addEventListener("click", () => {
  if (state.isSearching) return;
  resultsBody.innerHTML = "";
  state.results    = [];
  state.resultCount = 0;
  state.errorCount  = 0;
  filterInput.value = "";
  progressSection.hidden = true;
  resultsSection.hidden  = true;
  statsBar.hidden        = true;
  emptyState.hidden      = false;
  emptyState.querySelector("p").textContent =
    "Select a folder and enter a search term to begin.";
});

function startSearch() {
  const folder = folderInput.value.trim();
  const query  = queryInput.value.trim();

  if (!folder) { showError("Please select or enter a folder path."); return; }
  if (!query)  { showError("Please enter a search term.");           return; }

  const searchExcel = $("optExcel").checked;
  const searchWord  = $("optWord").checked;

  if (!searchExcel && !searchWord) {
    showError("Please enable at least one file type to search.");
    return;
  }

  state.lastQuery = query;
  window.electronAPI.removeSearchListeners();
  window.electronAPI.onSearchUpdate(handleSearchUpdate);

  resetUI();
  setSearchingState(true);

  window.electronAPI.startSearch({
    folder,
    query,
    case_sensitive: $("optCaseSensitive").checked,
    search_excel:   searchExcel,
    search_word:    searchWord,
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

window.electronAPI.onSearchUpdate(handleSearchUpdate);
