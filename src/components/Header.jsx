import React, { useState, useEffect } from "react";

export default function Header({ onOpenSettings }) {
  const [updateStatus, setUpdateStatus] = useState(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    const handler = (data) => setUpdateStatus(data);
    window.electronAPI.onUpdateStatus(handler);
    return () => window.electronAPI.removeUpdateListeners();
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18M3 15h18" />
          </svg>
          <span className="app-title">Excel Search</span>
          <span className="version-badge">v5</span>
        </div>
        <div className="header-right">
          <button
            className="header-btn"
            title="Settings"
            onClick={onOpenSettings}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {window.electronAPI && (
            <button
              className="header-btn"
              title="New Window"
              onClick={() => window.electronAPI.createNewWindow()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </button>
          )}
        </div>
      </header>
      {updateStatus?.type === "available" && (
        <div className="update-banner">
          <span className="update-banner-text">
            Update {updateStatus.info?.version} is available
          </span>
          <button
            className="update-banner-btn"
            onClick={() => window.electronAPI?.downloadUpdate()}
          >
            Download
          </button>
        </div>
      )}
      {updateStatus?.type === "downloaded" && (
        <div className="update-banner">
          <span className="update-banner-text">
            Update ready to install
          </span>
          <button
            className="update-banner-btn"
            onClick={() => window.electronAPI?.installUpdate()}
          >
            Restart &amp; Install
          </button>
        </div>
      )}
    </>
  );
}
