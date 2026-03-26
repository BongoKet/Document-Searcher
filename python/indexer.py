"""
SQLite-backed search index for Excel Search v5.

Stores extracted text content from Excel, Word, and PDF files.
Files are tracked by path, mtime, and size -- stale entries are
automatically refreshed on re-index.
"""

import os
import sqlite3
from pathlib import Path

DEFAULT_DB_DIR = os.path.join(Path.home(), ".excel-search")
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, "index.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    mtime REAL NOT NULL,
    size INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    section TEXT NOT NULL,
    text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_content_file ON content(file_id);
"""


class SearchIndex:
    def __init__(self, db_path=None):
        self.db_path = db_path or DEFAULT_DB_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    def is_fresh(self, filepath):
        """Return True if the file is indexed and its mtime+size still match."""
        try:
            stat = os.stat(filepath)
        except OSError:
            return False
        row = self.conn.execute(
            "SELECT mtime, size FROM files WHERE path = ?", (filepath,)
        ).fetchone()
        if row is None:
            return False
        return row[0] == stat.st_mtime and row[1] == stat.st_size

    def index_file(self, filepath, records):
        """
        Insert or replace a file's content records.
        records: list of { location, section, text }
        """
        stat = os.stat(filepath)
        cur = self.conn.cursor()

        existing = cur.execute(
            "SELECT id FROM files WHERE path = ?", (filepath,)
        ).fetchone()
        if existing:
            cur.execute("DELETE FROM content WHERE file_id = ?", (existing[0],))
            cur.execute(
                "UPDATE files SET mtime = ?, size = ? WHERE id = ?",
                (stat.st_mtime, stat.st_size, existing[0]),
            )
            file_id = existing[0]
        else:
            cur.execute(
                "INSERT INTO files (path, mtime, size) VALUES (?, ?, ?)",
                (filepath, stat.st_mtime, stat.st_size),
            )
            file_id = cur.lastrowid

        for rec in records:
            cur.execute(
                "INSERT INTO content (file_id, location, section, text) VALUES (?, ?, ?, ?)",
                (file_id, rec["location"], rec["section"], rec["text"]),
            )
        self.conn.commit()

    def search(self, query, case_sensitive=False, folders=None):
        """
        Search indexed content. Returns list of
        { file, location, section, value }.
        """
        if case_sensitive:
            like = f"%{query}%"
            clause = "content.text LIKE ? COLLATE BINARY"
        else:
            like = f"%{query.lower()}%"
            clause = "LOWER(content.text) LIKE ?"

        sql = f"""
            SELECT files.path, content.location, content.section, content.text
            FROM content
            JOIN files ON files.id = content.file_id
            WHERE {clause}
        """
        params = [like]

        if folders:
            placeholders = ",".join("?" for _ in folders)
            folder_clauses = " OR ".join(
                f"files.path LIKE ?" for _ in folders
            )
            sql += f" AND ({folder_clauses})"
            for f in folders:
                params.append(f.replace("\\", "/").rstrip("/") + "/%")

        results = []
        for row in self.conn.execute(sql, params):
            results.append({
                "file": row[0],
                "location": row[1],
                "section": row[2],
                "value": row[3][:500],
            })
        return results

    def get_indexed_files(self, folders=None):
        """Return list of indexed file paths, optionally filtered to folders."""
        if not folders:
            return [
                r[0] for r in self.conn.execute("SELECT path FROM files").fetchall()
            ]
        results = []
        for folder in folders:
            prefix = folder.replace("\\", "/").rstrip("/") + "/"
            rows = self.conn.execute(
                "SELECT path FROM files WHERE path LIKE ?", (prefix + "%",)
            ).fetchall()
            results.extend(r[0] for r in rows)
        return results

    def get_stale_files(self, folder, extensions):
        """Return files in folder that are indexed but stale (mtime/size changed)."""
        prefix = folder.replace("\\", "/").rstrip("/") + "/"
        stale = []
        for row in self.conn.execute(
            "SELECT path, mtime, size FROM files WHERE path LIKE ?",
            (prefix + "%",),
        ):
            path, mtime, size = row
            ext = os.path.splitext(path)[1].lower()
            if ext not in extensions:
                continue
            try:
                stat = os.stat(path)
                if stat.st_mtime != mtime or stat.st_size != size:
                    stale.append(path)
            except OSError:
                stale.append(path)
        return stale

    def status(self, folders=None):
        """Return summary: { total_files, total_content_rows }."""
        if folders:
            total_files = 0
            total_content = 0
            for folder in folders:
                prefix = folder.replace("\\", "/").rstrip("/") + "/"
                r = self.conn.execute(
                    "SELECT COUNT(*) FROM files WHERE path LIKE ?", (prefix + "%",)
                ).fetchone()
                total_files += r[0]
                r = self.conn.execute(
                    """SELECT COUNT(*) FROM content
                       JOIN files ON files.id = content.file_id
                       WHERE files.path LIKE ?""",
                    (prefix + "%",),
                ).fetchone()
                total_content += r[0]
            return {"total_files": total_files, "total_content": total_content}
        else:
            tf = self.conn.execute("SELECT COUNT(*) FROM files").fetchone()[0]
            tc = self.conn.execute("SELECT COUNT(*) FROM content").fetchone()[0]
            return {"total_files": tf, "total_content": tc}

    def clear(self):
        """Delete all indexed data."""
        self.conn.execute("DELETE FROM content")
        self.conn.execute("DELETE FROM files")
        self.conn.commit()
