import React, { useState, useRef, useEffect, useCallback } from "react";
import FolderSelector from "./FolderSelector";
import SearchHistory from "./SearchHistory";

export default function SearchPanel({
  onSearch,
  onStop,
  isSearching,
  history,
  onClearHistory,
}) {
  const [folders, setFolders] = useState([]);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchExcel, setSearchExcel] = useState(true);
  const [searchWord, setSearchWord] = useState(true);
  const [searchPdf, setSearchPdf] = useState(true);
  const [useIndex, setUseIndex] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const queryRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSearch = useCallback(() => {
    if (isSearching) {
      onStop();
      return;
    }
    if (folders.length === 0 || !query.trim()) return;
    if (!searchExcel && !searchWord && !searchPdf) return;

    onSearch({
      folders,
      query: query.trim(),
      case_sensitive: caseSensitive,
      search_excel: searchExcel,
      search_word: searchWord,
      search_pdf: searchPdf,
      use_index: useIndex,
    });
  }, [folders, query, caseSensitive, searchExcel, searchWord, searchPdf, useIndex, isSearching, onSearch, onStop]);

  const handleHistorySelect = useCallback((entry) => {
    if (entry.query) setQuery(entry.query);
    if (entry.folders) setFolders(entry.folders);
    setShowHistory(false);
  }, []);

  return (
    <section className="search-panel">
      <FolderSelector
        folders={folders}
        onChange={setFolders}
        disabled={isSearching}
      />

      <div className="input-row">
        <label className="input-label" htmlFor="queryInput">
          Search for
        </label>
        <div className="input-with-btn" ref={wrapperRef}>
          <div className="history-wrapper">
            <input
              id="queryInput"
              ref={queryRef}
              type="text"
              className="text-input"
              placeholder="Enter text to search for..."
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => history.length > 0 && setShowHistory(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
                if (e.key === "Escape") setShowHistory(false);
              }}
              disabled={isSearching}
            />
            <SearchHistory
              history={history}
              onSelect={handleHistorySelect}
              onClear={() => {
                onClearHistory();
                setShowHistory(false);
              }}
              visible={showHistory}
            />
          </div>
          <button
            className={`btn btn-primary${isSearching ? " stop" : ""}`}
            onClick={handleSearch}
          >
            {isSearching ? "Stop" : "Search"}
          </button>
        </div>
      </div>

      <div className="options-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          <span>Case sensitive</span>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={searchExcel}
            onChange={(e) => setSearchExcel(e.target.checked)}
          />
          <span>Excel (.xlsx, .xls)</span>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={searchWord}
            onChange={(e) => setSearchWord(e.target.checked)}
          />
          <span>Word (.docx)</span>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={searchPdf}
            onChange={(e) => setSearchPdf(e.target.checked)}
          />
          <span>PDF (.pdf)</span>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useIndex}
            onChange={(e) => setUseIndex(e.target.checked)}
          />
          <span>Use index</span>
        </label>
      </div>
    </section>
  );
}
