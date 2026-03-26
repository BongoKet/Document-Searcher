import React, { useState, useCallback } from "react";
import SearchPanel from "./SearchPanel";
import ProgressBar from "./ProgressBar";
import ResultsTable from "./ResultsTable";
import PreviewPane from "./PreviewPane";
import ErrorToast from "./ErrorToast";
import useSearch from "../hooks/useSearch";
import useHistory from "../hooks/useHistory";

export default function SearchTab({ tabId }) {
  const search = useSearch(tabId);
  const { history, addEntry, clearAll, refresh } = useHistory();
  const [selectedRow, setSelectedRow] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(
    (options) => {
      if (options.folders.length === 0) {
        setError("Please add at least one folder to search.");
        return;
      }
      if (!options.query) {
        setError("Please enter a search term.");
        return;
      }
      if (!options.search_excel && !options.search_word && !options.search_pdf) {
        setError("Please enable at least one file type to search.");
        return;
      }
      setError(null);
      setSelectedRow(null);
      setShowPreview(false);
      search.startSearch(options);

      addEntry({
        query: options.query,
        folders: options.folders,
        options: {
          case_sensitive: options.case_sensitive,
          search_excel: options.search_excel,
          search_word: options.search_word,
          search_pdf: options.search_pdf,
        },
      });
    },
    [search, addEntry]
  );

  const handleSelectRow = useCallback(
    (idx) => {
      setSelectedRow(idx);
      setShowPreview(true);
      const row = search.results[idx];
      if (row && row.kind === "result") {
        search.requestPreview(row.file, row.cell);
      }
    },
    [search]
  );

  const handleClear = useCallback(() => {
    search.clearResults();
    setSelectedRow(null);
    setShowPreview(false);
  }, [search]);

  const selectedResult =
    selectedRow != null ? search.results[selectedRow] : null;

  return (
    <>
      <SearchPanel
        onSearch={handleSearch}
        onStop={search.stopSearch}
        isSearching={search.isSearching}
        history={history}
        onClearHistory={clearAll}
      />

      <ProgressBar
        scanned={search.scanned}
        total={search.total}
        label={search.progressLabel}
        visible={search.isSearching || search.done}
      />

      <div className="results-split">
        <div className="results-main">
          <ResultsTable
            results={search.results}
            lastQuery={search.lastQuery}
            caseSensitive={false}
            resultCount={search.resultCount}
            errorCount={search.errorCount}
            scanned={search.scanned}
            total={search.total}
            isSearching={search.isSearching}
            done={search.done}
            onClear={handleClear}
            selectedRow={selectedRow}
            onSelectRow={handleSelectRow}
          />
        </div>

        {showPreview && (
          <PreviewPane
            result={selectedResult}
            previewData={search.previewData}
            query={search.lastQuery}
            onClose={() => {
              setShowPreview(false);
              setSelectedRow(null);
            }}
          />
        )}
      </div>

      <ErrorToast
        message={error || search.errorMessage}
        onDismiss={() => setError(null)}
      />
    </>
  );
}
