import { useState, useCallback, useEffect } from "react";

const initialState = {
  isSearching: false,
  results: [],
  scanned: 0,
  total: 0,
  resultCount: 0,
  errorCount: 0,
  progressLabel: "",
  lastQuery: "",
  done: false,
  errorMessage: null,
  previewData: null,
};

export default function useSearch() {
  const [state, setState] = useState(initialState);

  const handleMessage = useCallback((msg) => {
    setState((prev) => {
      switch (msg.type) {
        case "total":
          return {
            ...prev,
            total: msg.total,
            progressLabel: `Found ${msg.total} file${msg.total !== 1 ? "s" : ""} to scan...`,
          };

        case "progress":
          return {
            ...prev,
            scanned: msg.scanned,
            progressLabel: `Scanning (${msg.scanned}/${prev.total}): ${msg.file}`,
          };

        case "result":
          return {
            ...prev,
            resultCount: prev.resultCount + 1,
            results: [...prev.results, { kind: "result", ...msg }],
          };

        case "file_error":
          return {
            ...prev,
            errorCount: prev.errorCount + 1,
            results: [...prev.results, { kind: "error", ...msg }],
          };

        case "done":
          return {
            ...prev,
            isSearching: false,
            done: true,
            scanned: msg.scanned,
            progressLabel:
              `Done — scanned ${msg.scanned} file${msg.scanned !== 1 ? "s" : ""}, ` +
              `found ${prev.resultCount} match${prev.resultCount !== 1 ? "es" : ""}.`,
          };

        case "stopped":
          return {
            ...prev,
            isSearching: false,
            done: true,
            progressLabel: `Search stopped at ${prev.scanned} file${prev.scanned !== 1 ? "s" : ""}.`,
          };

        case "error":
          return {
            ...prev,
            isSearching: false,
            done: true,
            progressLabel: "Search failed.",
            errorMessage: msg.message || "An unknown error occurred.",
          };

        case "preview_data":
          return { ...prev, previewData: msg };

        case "index_progress":
        case "index_done":
        case "index_status":
          return prev;

        default:
          return prev;
      }
    });
  }, []);

  const startSearch = useCallback((options) => {
    if (!window.electronAPI) return;
    window.electronAPI.removeSearchListeners();
    window.electronAPI.onSearchUpdate(handleMessage);

    setState({
      ...initialState,
      isSearching: true,
      lastQuery: options.query,
      progressLabel: "Counting files...",
    });

    window.electronAPI.startSearch(options);
  }, [handleMessage]);

  const stopSearch = useCallback(() => {
    if (!window.electronAPI) return;
    window.electronAPI.stopSearch();
    setState((prev) => ({
      ...prev,
      isSearching: false,
      done: true,
      progressLabel: `Search stopped at ${prev.scanned} file${prev.scanned !== 1 ? "s" : ""}.`,
    }));
  }, []);

  const clearResults = useCallback(() => {
    setState(initialState);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, errorMessage: null }));
  }, []);

  const requestPreview = useCallback((file, location) => {
    if (!window.electronAPI) return;
    window.electronAPI.requestPreview({ file, location });
  }, []);

  useEffect(() => {
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeSearchListeners();
      }
    };
  }, []);

  return { ...state, startSearch, stopSearch, clearResults, clearError, requestPreview };
}
