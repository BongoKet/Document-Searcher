import { useState, useEffect, useCallback } from "react";

export default function useHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getHistory().then((h) => {
      if (h) setHistory(h);
    });
  }, []);

  const addEntry = useCallback(async (entry) => {
    if (!window.electronAPI) return;
    const updated = await window.electronAPI.addHistory(entry);
    if (updated) setHistory(updated);
  }, []);

  const clearAll = useCallback(async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.clearHistory();
    setHistory([]);
  }, []);

  const refresh = useCallback(async () => {
    if (!window.electronAPI) return;
    const h = await window.electronAPI.getHistory();
    if (h) setHistory(h);
  }, []);

  return { history, addEntry, clearAll, refresh };
}
