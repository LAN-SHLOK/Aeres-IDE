"""
Database Viewer API — Allows the IDE frontend to introspect local SQLite databases.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import os

router = APIRouter()


class DbInfoRequest(BaseModel):
    path: str


class DbTableRequest(BaseModel):
    path: str
    table: str
    limit: int = 200
    offset: int = 0


def _connect(path: str) -> sqlite3.Connection:
    """Safely open a read-only connection to a local SQLite file."""
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"Database file not found: {path}")
    try:
        # Open in read-only mode via URI to prevent accidental writes
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.DatabaseError as exc:
        raise HTTPException(status_code=400, detail=f"Cannot open database: {exc}")


@router.post("/info")
async def db_info(req: DbInfoRequest):
    """Return every table name and its row count inside the given SQLite file."""
    conn = _connect(req.path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = []
        for row in cursor.fetchall():
            name = row["name"]
            try:
                count = conn.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
            except Exception:
                count = -1
            tables.append({"name": name, "row_count": count})

        # Also grab views
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name"
        )
        views = [{"name": row["name"], "type": "view"} for row in cursor.fetchall()]

        return {"tables": tables, "views": views, "path": req.path}
    finally:
        conn.close()


@router.post("/table")
async def db_table(req: DbTableRequest):
    """Return schema + rows for a single table (paginated)."""
    conn = _connect(req.path)
    try:
        cursor = conn.cursor()

        # Get column info via PRAGMA
        cursor.execute(f'PRAGMA table_info("{req.table}")')
        columns = []
        for col in cursor.fetchall():
            columns.append({
                "cid": col["cid"],
                "name": col["name"],
                "type": col["type"],
                "notnull": bool(col["notnull"]),
                "pk": bool(col["pk"]),
            })

        # Fetch rows with pagination
        safe_limit = min(max(1, req.limit), 1000)
        safe_offset = max(0, req.offset)
        cursor.execute(
            f'SELECT * FROM "{req.table}" LIMIT ? OFFSET ?',
            (safe_limit, safe_offset),
        )
        rows = [dict(r) for r in cursor.fetchall()]

        # Total row count
        try:
            total = conn.execute(f'SELECT COUNT(*) FROM "{req.table}"').fetchone()[0]
        except sqlite3.OperationalError:
            total = -1

        return {
            "table": req.table,
            "columns": columns,
            "rows": rows,
            "total": total,
            "limit": safe_limit,
            "offset": safe_offset,
        }
    except sqlite3.OperationalError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()


@router.post("/query")
async def db_query(req: DbTableRequest):
    """Run a raw read-only SQL query (SELECT only)."""
    sql = req.table.strip()
    if not sql.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")

    conn = _connect(req.path)
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        col_names = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [dict(zip(col_names, row)) for row in cursor.fetchmany(min(req.limit, 1000))]
        return {"columns": col_names, "rows": rows, "total": len(rows)}
    except sqlite3.OperationalError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        conn.close()
