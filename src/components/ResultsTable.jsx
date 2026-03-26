import React, { useState, useMemo, useCallback } from "react";

function basename(filePath) {
  return (filePath || "").replace(/\\/g, "/").split("/").pop();
}

function dirname(filePath) {
  const n = (filePath || "").replace(/\\/g, "/");
  const idx = n.lastIndexOf("/");
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
  if (!query || !text) return escapeHtml(text || "");
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flags = caseSensitive ? "g" : "gi";
  const re = new RegExp(`(${escaped})`, flags);
  const parts = text.split(re);
  return parts
    .map((part) =>
      re.test(part) ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)
    )
    .join("");
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" />
      <path d="M10 2h4v4" />
      <line x1="14" y1="2" x2="8" y2="8" />
    </svg>
  );
}

export default function ResultsTable({
  results,
  lastQuery,
  caseSensitive,
  resultCount,
  errorCount,
  scanned,
  total,
  isSearching,
  done,
  onClear,
  selectedRow,
  onSelectRow,
}) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) {
        setSortAsc((prev) => !prev);
      } else {
        setSortKey(key);
        setSortAsc(true);
      }
    },
    [sortKey]
  );

  const filteredResults = useMemo(() => {
    let items = results;
    if (filter.trim()) {
      const term = filter.toLowerCase();
      items = items.filter(
        (r) =>
          (r.file || "").toLowerCase().includes(term) ||
          (r.sheet || "").toLowerCase().includes(term) ||
          (r.cell || "").toLowerCase().includes(term) ||
          (r.value || "").toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const av = (a[sortKey] || "").toLowerCase();
        const bv = (b[sortKey] || "").toLowerCase();
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return items;
  }, [results, filter, sortKey, sortAsc]);

  const exportCsv = useCallback(() => {
    const rows = filteredResults.filter((r) => r.kind === "result");
    if (!rows.length) return;
    const csv = [
      ["File", "Directory", "Sheet / Section", "Cell / Location", "Matched Value"],
      ...rows.map((r) => [
        basename(r.file),
        dirname(r.file),
        r.sheet || "",
        r.cell || "",
        r.value || "",
      ]),
    ]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "excel-search-results.csv",
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredResults]);

  const openFile = useCallback(async (filePath) => {
    if (!filePath || !window.electronAPI) return;
    const err = await window.electronAPI.openFile(filePath);
    if (err) console.error("Could not open file:", err);
  }, []);

  const showResults = results.length > 0 || done;
  const showEmpty = done && resultCount === 0 && errorCount === 0;

  if (!showResults && !isSearching) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="8" y="4" width="32" height="40" rx="3" />
          <path d="M16 16h16M16 24h16M16 32h10" />
          <circle cx="36" cy="36" r="8" />
          <path d="M33 36h6M36 33v6" />
        </svg>
        <p>Select folders and enter a search term to begin.</p>
      </div>
    );
  }

  if (showEmpty) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="8" y="4" width="32" height="40" rx="3" />
          <path d="M16 16h16M16 24h16M16 32h10" />
          <circle cx="36" cy="36" r="8" />
          <path d="M33 36h6M36 33v6" />
        </svg>
        <p>No matches found. Try a different search term or folder.</p>
      </div>
    );
  }

  const renderSortIcon = (key) => {
    if (sortKey === key) return sortAsc ? "↑" : "↓";
    return "↕";
  };

  return (
    <section className="results-section">
      {(resultCount > 0 || errorCount > 0) && (
        <div className="stats-bar">
          <span className="stat">
            {scanned} / {total} files
          </span>
          <span className="stat-divider">·</span>
          <span className="stat">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </span>
          <span className="stat-divider">·</span>
          <span className={`stat${errorCount > 0 ? " stat-error" : ""}`}>
            {errorCount > 0
              ? `${errorCount} error${errorCount !== 1 ? "s" : ""}`
              : "no errors"}
          </span>
        </div>
      )}

      <div className="results-header">
        <span className="results-title">Results ({resultCount})</span>
        <div className="results-controls">
          <input
            type="text"
            className="filter-input"
            placeholder="Filter results..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="btn btn-ghost" onClick={onClear} disabled={isSearching}>
            Clear
          </button>
          <button className="btn btn-ghost" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="col-file" onClick={() => handleSort("file")}>
                File <span className="sort-icon">{renderSortIcon("file")}</span>
              </th>
              <th className="col-sheet" onClick={() => handleSort("sheet")}>
                Sheet / Section{" "}
                <span className="sort-icon">{renderSortIcon("sheet")}</span>
              </th>
              <th className="col-cell" onClick={() => handleSort("cell")}>
                Cell / Location{" "}
                <span className="sort-icon">{renderSortIcon("cell")}</span>
              </th>
              <th className="col-value">Matched Value</th>
              <th className="col-open"></th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((row, i) => {
              if (row.kind === "error") {
                return (
                  <tr key={i} className="error-row">
                    <td title={row.file || ""}>
                      <span className="cell-file">{basename(row.file)}</span>
                      <span className="cell-dir">{dirname(row.file)}</span>
                    </td>
                    <td colSpan="3" style={{ color: "var(--red)" }}>
                      ⚠ {row.error || "Unknown error"}
                    </td>
                    <td></td>
                  </tr>
                );
              }
              const isSelected = selectedRow === i;
              return (
                <tr
                  key={i}
                  className={isSelected ? "selected" : ""}
                  onClick={() => onSelectRow(i)}
                >
                  <td title={row.file || ""}>
                    <span
                      className="cell-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFile(row.file);
                      }}
                    >
                      {basename(row.file)}
                    </span>
                    <span className="cell-dir">{dirname(row.file)}</span>
                  </td>
                  <td className="cell-sheet">{row.sheet || ""}</td>
                  <td className="cell-location">{row.cell || ""}</td>
                  <td
                    className="cell-value"
                    dangerouslySetInnerHTML={{
                      __html: highlightMatch(
                        row.value || "",
                        lastQuery,
                        caseSensitive
                      ),
                    }}
                  />
                  <td>
                    <button
                      className="open-btn"
                      title="Open file"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFile(row.file);
                      }}
                    >
                      <OpenIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
