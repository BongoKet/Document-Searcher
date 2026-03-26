import React from "react";

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SearchHistory({ history, onSelect, onClear, visible }) {
  if (!visible || history.length === 0) return null;

  return (
    <div className="history-dropdown">
      {history.map((entry, i) => (
        <div
          key={entry.timestamp || i}
          className="history-item"
          onClick={() => onSelect(entry)}
        >
          <span className="history-query">{entry.query}</span>
          <span className="history-meta">
            {entry.resultCount != null ? `${entry.resultCount} results` : ""}
            {entry.timestamp ? ` · ${timeAgo(entry.timestamp)}` : ""}
          </span>
        </div>
      ))}
      <div className="history-clear" onClick={onClear}>
        Clear history
      </div>
    </div>
  );
}
