import React, { useCallback } from "react";

export default function FolderSelector({ folders, onChange, disabled }) {
  const handleBrowse = useCallback(async () => {
    if (!window.electronAPI) return;
    const selected = await window.electronAPI.selectFolders();
    if (selected && selected.length > 0) {
      onChange((prev) => {
        const set = new Set(prev);
        selected.forEach((f) => set.add(f));
        return [...set];
      });
    }
  }, [onChange]);

  const removeFolder = useCallback(
    (folder) => {
      onChange((prev) => prev.filter((f) => f !== folder));
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const items = Array.from(e.dataTransfer.items || []);
      const paths = [];
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry && entry.isDirectory) {
          paths.push(entry.fullPath || entry.name);
        }
      }
      const files = Array.from(e.dataTransfer.files || []);
      for (const file of files) {
        if (file.path) paths.push(file.path);
      }
      if (paths.length > 0) {
        onChange((prev) => {
          const set = new Set(prev);
          paths.forEach((p) => set.add(p));
          return [...set];
        });
      }
    },
    [onChange]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  return (
    <div className="input-row">
      <label className="input-label">Folders</label>
      <div
        className="folder-selector"
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
      >
        {folders.length === 0 && (
          <span className="folder-selector-empty">
            Drop folders here or click Browse...
          </span>
        )}
        {folders.map((f) => (
          <span key={f} className="folder-chip" title={f}>
            {f.replace(/\\/g, "/").split("/").pop() || f}
            {!disabled && (
              <button
                className="folder-chip-remove"
                onClick={() => removeFolder(f)}
              >
                &times;
              </button>
            )}
          </span>
        ))}
      </div>
      <button
        className="btn btn-secondary"
        onClick={handleBrowse}
        disabled={disabled}
      >
        Browse
      </button>
    </div>
  );
}
