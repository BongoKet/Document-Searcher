# Document Searcher

A desktop application for searching through Excel, Word, and PDF files. Built with Electron, React, and Python.

## Features

- **Multi-format search** -- Search across `.xlsx`, `.xls`, `.docx`, and `.pdf` files
- **Multi-folder search** -- Select multiple folders to search at once
- **Tabbed interface** -- Run independent searches in separate tabs (Ctrl+T / Ctrl+W)
- **Preview pane** -- Click a result to see surrounding content in context
- **Search history** -- Recent searches are saved and accessible from a dropdown
- **Search indexing** -- SQLite-backed persistent index for faster repeat searches
- **CSV export** -- Export filtered results to CSV
- **Settings** -- Configure file types, indexing, max results, auto-update preferences
- **Auto-update** -- Checks GitHub Releases for new versions
- **Multi-window** -- Open additional windows with Ctrl+Shift+N
- **Cross-platform** -- Builds for Windows (NSIS), macOS (DMG), and Linux (AppImage/DEB)

## Project Structure

```
main/
  main.js          -- Electron main process (windows, IPC, settings, auto-update)
  preload.js       -- Context bridge API for renderer
src/
  main.jsx         -- React entry point
  App.jsx          -- App shell with tab management
  components/      -- React components (SearchTab, ResultsTable, PreviewPane, etc.)
  hooks/           -- Custom hooks (useSearch, useSettings, useHistory)
  styles/          -- Global CSS (dark theme)
python/
  search.py        -- Search backend (Excel, Word, PDF, indexing, preview)
  indexer.py        -- SQLite persistent index module
  requirements.txt -- Python dependencies
```

## Development

### Prerequisites

- Node.js 18+
- Python 3.9+
- pip

### Setup

```bash
npm install
pip install -r python/requirements.txt
```

### Run in development

```bash
npm run dev
```

This starts the Vite dev server and Electron concurrently.

### Build installer

```bash
npm run build
```

Output goes to `dist_electron/`.

### Build and publish a release

```powershell
$env:GH_TOKEN = (gh auth token)
npm run build -- --publish always
```

## Python Backend

The Python backend communicates with Electron via newline-delimited JSON over stdin/stdout. It supports these commands:

| Command | Description |
|---------|-------------|
| `search` | Search files in folders for a query string |
| `preview` | Extract surrounding context for a matched result |
| `index` | Build/refresh the SQLite search index |
| `search_indexed` | Search using the persistent index |
| `index_status` | Get indexed file count and staleness info |
| `clear_index` | Delete the index database |

### Bundling for production

Use PyInstaller to freeze the Python backend:

```bash
pyinstaller search.spec
```

Place the output binary in `resources/` before running `npm run build`.

## License

MIT
