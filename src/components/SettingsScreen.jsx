import React, { useState, useEffect } from "react";
import useSettings from "../hooks/useSettings";

export default function SettingsScreen({ onClose }) {
  const { settings, loaded, saveSettings, resetSettings } = useSettings();
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (loaded) setDraft(settings);
  }, [loaded, settings]);

  const update = (section, key, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSave = async () => {
    await saveSettings(draft);
    onClose();
  };

  const handleReset = async () => {
    const defaults = await resetSettings();
    if (defaults) setDraft(defaults);
  };

  if (!loaded) return null;

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">General</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Default case sensitivity</div>
            <div className="settings-row-desc">
              Start new searches with case-sensitive matching
            </div>
          </div>
          <input
            type="checkbox"
            checked={draft.general?.caseSensitive || false}
            onChange={(e) => update("general", "caseSensitive", e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Max results</div>
            <div className="settings-row-desc">
              Maximum number of results to display per search
            </div>
          </div>
          <input
            type="number"
            className="settings-input"
            style={{ width: 100 }}
            value={draft.general?.maxResults || 10000}
            onChange={(e) =>
              update("general", "maxResults", parseInt(e.target.value) || 10000)
            }
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Value truncation length</div>
            <div className="settings-row-desc">
              Maximum characters shown per matched value
            </div>
          </div>
          <input
            type="number"
            className="settings-input"
            style={{ width: 100 }}
            value={draft.general?.truncateLength || 500}
            onChange={(e) =>
              update("general", "truncateLength", parseInt(e.target.value) || 500)
            }
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">File Types</h3>
        <div className="settings-row">
          <div className="settings-row-label">Enable Excel search by default</div>
          <input
            type="checkbox"
            checked={draft.fileTypes?.excel ?? true}
            onChange={(e) => update("fileTypes", "excel", e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-label">Enable Word search by default</div>
          <input
            type="checkbox"
            checked={draft.fileTypes?.word ?? true}
            onChange={(e) => update("fileTypes", "word", e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-label">Enable PDF search by default</div>
          <input
            type="checkbox"
            checked={draft.fileTypes?.pdf ?? true}
            onChange={(e) => update("fileTypes", "pdf", e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Indexing</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Enable search indexing</div>
            <div className="settings-row-desc">
              Build a persistent SQLite index for faster repeat searches
            </div>
          </div>
          <input
            type="checkbox"
            checked={draft.indexing?.enabled ?? true}
            onChange={(e) => update("indexing", "enabled", e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Auto-index on search</div>
            <div className="settings-row-desc">
              Automatically index files when a search starts
            </div>
          </div>
          <input
            type="checkbox"
            checked={draft.indexing?.autoIndex || false}
            onChange={(e) => update("indexing", "autoIndex", e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Index database path</div>
            <div className="settings-row-desc">
              Leave empty to use the default location
            </div>
          </div>
          <input
            type="text"
            className="settings-input"
            value={draft.indexing?.dbPath || ""}
            onChange={(e) => update("indexing", "dbPath", e.target.value)}
            placeholder="Default"
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-label">Clear search index</div>
          <button
            className="btn btn-ghost"
            style={{ color: "var(--red)", borderColor: "var(--red)" }}
            onClick={() => {
              if (window.electronAPI) window.electronAPI.clearIndex();
            }}
          >
            Clear Index
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Updates</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Auto-check for updates</div>
            <div className="settings-row-desc">
              Check for new versions when the app starts
            </div>
          </div>
          <input
            type="checkbox"
            checked={draft.updates?.autoCheck ?? true}
            onChange={(e) => update("updates", "autoCheck", e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-label">Check now</div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (window.electronAPI) window.electronAPI.checkForUpdates();
            }}
          >
            Check for Updates
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">Current version</div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>5.0.0</span>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">History</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Max history entries</div>
            <div className="settings-row-desc">
              Number of past searches to remember
            </div>
          </div>
          <input
            type="number"
            className="settings-input"
            style={{ width: 100 }}
            value={draft.history?.maxEntries || 100}
            onChange={(e) =>
              update("history", "maxEntries", parseInt(e.target.value) || 100)
            }
          />
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          Save
        </button>
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-ghost"
          onClick={handleReset}
          style={{ marginLeft: "auto" }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
