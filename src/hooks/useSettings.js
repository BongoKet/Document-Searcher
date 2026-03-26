import { useState, useEffect, useCallback } from "react";

const fallbackSettings = {
  general: { caseSensitive: false, maxResults: 10000, truncateLength: 500 },
  fileTypes: { excel: true, word: true, pdf: true },
  indexing: { enabled: true, dbPath: "", autoIndex: false },
  appearance: { theme: "dark" },
  updates: { autoCheck: true, channel: "latest" },
  history: { maxEntries: 100 },
};

export default function useSettings() {
  const [settings, setSettingsState] = useState(fallbackSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) {
      setLoaded(true);
      return;
    }
    window.electronAPI.getSettings().then((s) => {
      if (s) setSettingsState(s);
      setLoaded(true);
    });
  }, []);

  const saveSettings = useCallback(async (next) => {
    setSettingsState(next);
    if (window.electronAPI) {
      await window.electronAPI.setSettings(next);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    if (window.electronAPI) {
      const defaults = await window.electronAPI.resetSettings();
      setSettingsState(defaults);
    } else {
      setSettingsState(fallbackSettings);
    }
  }, []);

  return { settings, loaded, saveSettings, resetSettings };
}
