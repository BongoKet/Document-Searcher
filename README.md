# Excel Search v4

A desktop application to search for text across all Excel (.xlsx, .xls) and Word (.docx) files in a folder and its subfolders. Built with an Electron GUI and a Python search backend.

## Requirements

- **Node.js** (https://nodejs.org) — for Electron
- **Python 3.8+** (https://python.org) — must be in your PATH

## Setup

### 1. Install Python dependencies

```bash
pip install -r python/requirements.txt
```

### 2. Install Node / Electron dependencies

```bash
npm install
```

### 3. Run

```bash
npm start
```

## How It Works

- The Electron main process spawns `python/search.py` as a child process when a search starts.
- The two communicate over stdin/stdout using newline-delimited JSON.
- Results stream back in real time as files are scanned.

## Features

- Real-time streaming results as files are scanned
- Supports `.xlsx`, `.xls` (Excel) and `.docx` (Word)
- Case-sensitive / case-insensitive toggle
- Per-file-type toggles (Excel / Word)
- Live result filtering
- Click any result filename to open the file
- Export results to CSV
- Stop an in-progress search at any time

## Project Structure

```
Excel Search v4/
├── main.js          # Electron main process
├── preload.js       # Context bridge (IPC)
├── package.json
├── renderer/
│   ├── index.html
│   ├── styles.css
│   └── renderer.js
└── python/
    ├── search.py        # Search backend
    └── requirements.txt
```
