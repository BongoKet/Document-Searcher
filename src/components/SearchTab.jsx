import React, { useState, useCallback } from "react";
import SearchPanel from "./SearchPanel";
import ProgressBar from "./ProgressBar";
import ResultsTable from "./ResultsTable";
import PreviewPane from "./PreviewPane";
import ErrorToast from "./ErrorToast";
import useSearch from "../hooks/useSearch";
import useHistory from "../hooks/useHistory";

export default function SearchTab() {
  const search = useSearch();
  const { history, addEntry, clearAll } = useHistory();
  const [selectedResult, setSelectedResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [caseSensitive, setCaseSensitive] = useState(false);

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
      setSelectedResult(null);
      setShowPreview(false);
      setCaseSensitive(options.case_sensitive);
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

  const handleSelectResult = useCallback(
    (row) => {
      setSelectedResult(row);
      setShowPreview(true);
      if (row && row.kind === "result") {
        search.requestPreview(row.file, row.cell);
      }
    },
    [search]
  );

  const handleClear = useCallback(() => {
    search.clearResults();
    setSelectedResult(null);
    setShowPreview(false);
  }, [search]);

  const handleDismissError = useCallback(() => {
    setError(null);
    search.clearError();
  }, [search]);

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
            caseSensitive={caseSensitive}
            resultCount={search.resultCount}
            errorCount={search.errorCount}
            scanned={search.scanned}
            total={search.total}
            isSearching={search.isSearching}
            done={search.done}
            onClear={handleClear}
            selectedResult={selectedResult}
            onSelectResult={handleSelectResult}
          />
        </div>

        {showPreview && (
          <PreviewPane
            result={selectedResult}
            previewData={search.previewData}
            query={search.lastQuery}
            onClose={() => {
              setShowPreview(false);
              setSelectedResult(null);
            }}
          />
        )}
      </div>

      <ErrorToast
        message={error || search.errorMessage}
        onDismiss={handleDismissError}
      />
    </>
  );
}
