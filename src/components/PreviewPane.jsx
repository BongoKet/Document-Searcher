import React, { useEffect, useState } from "react";

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightInText(text, query) {
  if (!query || !text) return escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);
  return parts
    .map((p) => (re.test(p) ? `<mark>${escapeHtml(p)}</mark>` : escapeHtml(p)))
    .join("");
}

function colLetter(idx) {
  let result = "";
  let n = idx + 1;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

function ExcelPreview({ content, highlightCell }) {
  if (!content || !Array.isArray(content)) {
    return <div className="preview-placeholder">No preview data</div>;
  }

  const cols = content.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="preview-grid" style={{ gridTemplateColumns: `40px repeat(${cols}, minmax(80px, 1fr))` }}>
      <div className="preview-grid-cell header"></div>
      {Array.from({ length: cols }, (_, c) => (
        <div key={c} className="preview-grid-cell header">
          {colLetter(c)}
        </div>
      ))}
      {content.map((row, r) => (
        <React.Fragment key={r}>
          <div className="preview-grid-cell header">{r + 1}</div>
          {Array.from({ length: cols }, (_, c) => {
            const val = row[c] != null ? String(row[c]) : "";
            const cellRef = `${colLetter(c)}${r + 1}`;
            const isHighlighted = highlightCell && cellRef === highlightCell;
            return (
              <div
                key={c}
                className={`preview-grid-cell${isHighlighted ? " highlighted" : ""}`}
                title={val}
              >
                {val}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function TextPreview({ content, query }) {
  return (
    <div
      className="preview-text"
      dangerouslySetInnerHTML={{ __html: highlightInText(content, query) }}
    />
  );
}

export default function PreviewPane({ result, previewData, query, onClose }) {
  if (!result) {
    return (
      <div className="preview-pane">
        <div className="preview-header">
          <span className="preview-title">Preview</span>
        </div>
        <div className="preview-placeholder">Select a result to preview</div>
      </div>
    );
  }

  const filename = (result.file || "").replace(/\\/g, "/").split("/").pop();

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <span className="preview-title" title={result.file}>
          {filename} — {result.sheet || ""} {result.cell || ""}
        </span>
        <button className="preview-close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="preview-body">
        {previewData ? (
          previewData.format === "table" ? (
            <ExcelPreview
              content={previewData.content}
              highlightCell={result.cell}
            />
          ) : (
            <TextPreview content={previewData.content} query={query} />
          )
        ) : (
          <div className="preview-text">
            <p style={{ marginBottom: "8px", color: "var(--text-muted)", fontSize: "11px" }}>
              {result.sheet} · {result.cell}
            </p>
            <div
              dangerouslySetInnerHTML={{
                __html: highlightInText(result.value || "", query),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
