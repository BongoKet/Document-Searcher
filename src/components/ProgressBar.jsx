import React from "react";

export default function ProgressBar({ scanned, total, label, visible }) {
  if (!visible) return null;

  const pct = total > 0 ? Math.round((scanned / total) * 100) : 0;
  const isIndeterminate = total === 0;

  return (
    <div className="progress-section">
      <div className="progress-track">
        <div
          className={`progress-bar${isIndeterminate ? " indeterminate" : ""}`}
          style={isIndeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
      <p className="progress-label">{label}</p>
    </div>
  );
}
