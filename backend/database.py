"""
SQLite persistence layer for detection history.
"""

import sqlite3
import json
import logging
from datetime import datetime
from config import DATABASE_PATH

logger = logging.getLogger(__name__)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they do not exist."""
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS detection_history (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp       TEXT NOT NULL,
                source          TEXT NOT NULL,
                face_count      INTEGER NOT NULL DEFAULT 0,
                with_mask       INTEGER NOT NULL DEFAULT 0,
                without_mask    INTEGER NOT NULL DEFAULT 0,
                incorrect_mask  INTEGER NOT NULL DEFAULT 0,
                detections_json TEXT,
                avg_confidence  REAL
            )
            """
        )
        conn.commit()
    logger.info("Database initialised at %s", DATABASE_PATH)


def insert_detection(
    source: str,
    face_count: int,
    summary: dict,
    detections: list[dict],
) -> int:
    """Insert a detection event and return the new row id."""
    ts = datetime.utcnow().isoformat()
    with_mask = summary.get("with_mask", 0)
    without_mask = summary.get("without_mask", 0)
    incorrect = summary.get("mask_weared_incorrect", 0)

    confidences = [d.get("confidence", 0) for d in detections]
    avg_conf = (sum(confidences) / len(confidences)) if confidences else None

    # Strip face_roi and convert any numpy scalar types to native python primitives
    safe_dets = []
    for d in detections:
        clean_d = {}
        for k, v in d.items():
            if k == "face_roi":
                continue
            if hasattr(v, "item"):
                clean_d[k] = v.item()
            elif isinstance(v, dict):
                clean_d[k] = {ik: (iv.item() if hasattr(iv, "item") else iv) for ik, iv in v.items()}
            else:
                clean_d[k] = v
        safe_dets.append(clean_d)

    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO detection_history
                (timestamp, source, face_count, with_mask, without_mask,
                 incorrect_mask, detections_json, avg_confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ts, source, face_count,
                with_mask, without_mask, incorrect,
                json.dumps(safe_dets),
                avg_conf,
            ),
        )
        conn.commit()
        return cur.lastrowid


def fetch_history(limit: int = 100, offset: int = 0, source_filter: str | None = None) -> list[dict]:
    """Retrieve paginated detection history."""
    with get_connection() as conn:
        if source_filter:
            rows = conn.execute(
                """
                SELECT * FROM detection_history
                WHERE source = ?
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
                """,
                (source_filter, limit, offset),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM detection_history
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            ).fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d["detections"] = json.loads(d.pop("detections_json") or "[]")
        result.append(d)
    return result


def fetch_statistics() -> dict:
    """Aggregate statistics over all stored history."""
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*)                AS total_sessions,
                COALESCE(SUM(face_count), 0)     AS total_faces,
                COALESCE(SUM(with_mask), 0)      AS total_with_mask,
                COALESCE(SUM(without_mask), 0)   AS total_without_mask,
                COALESCE(SUM(incorrect_mask), 0) AS total_incorrect,
                COALESCE(AVG(avg_confidence), 0) AS avg_confidence
            FROM detection_history
            """
        ).fetchone()
        daily = conn.execute(
            """
            SELECT
                DATE(timestamp) AS day,
                SUM(face_count)    AS faces,
                SUM(with_mask)     AS with_mask,
                SUM(without_mask)  AS without_mask
            FROM detection_history
            GROUP BY DATE(timestamp)
            ORDER BY day DESC
            LIMIT 30
            """
        ).fetchall()

    stats = dict(row)
    stats["daily_activity"] = [dict(d) for d in daily]
    return stats


def clear_history() -> int:
    """Delete all history rows. Returns count of deleted rows."""
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM detection_history")
        conn.commit()
        return cur.rowcount


def count_history(source_filter: str | None = None) -> int:
    """Return total number of history records (with optional source filter)."""
    with get_connection() as conn:
        if source_filter:
            row = conn.execute(
                "SELECT COUNT(*) FROM detection_history WHERE source = ?",
                (source_filter,),
            ).fetchone()
        else:
            row = conn.execute("SELECT COUNT(*) FROM detection_history").fetchone()
    return row[0]
