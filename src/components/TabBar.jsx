import React from "react";

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onAdd }) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item${tab.id === activeTabId ? " active" : ""}`}
          onClick={() => onSelect(tab.id)}
        >
          <span>{tab.label}</span>
          {tabs.length > 1 && (
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              &times;
            </span>
          )}
        </button>
      ))}
      <button className="tab-add" onClick={onAdd} title="New Tab (Ctrl+T)">
        +
      </button>
    </div>
  );
}
