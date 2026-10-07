"""운영 로그 (spec 5.7). 사진, 주소 문자열, 좌표, 이름은 남기지 않는다."""

import json
import logging
import sqlite3
from pathlib import Path

log = logging.getLogger("jipgyeol")

DB_PATH = Path(__file__).resolve().parents[1] / "analyze_log.sqlite3"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS analyze_log (
  requestId TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  record TEXT NOT NULL
)
"""


def write_log(record: dict, db_path: Path | str | None = None) -> None:
    """실패해도 요청을 막지 않는다."""
    try:
        with sqlite3.connect(db_path or DB_PATH) as con:
            con.execute(_SCHEMA)
            con.execute(
                "INSERT OR REPLACE INTO analyze_log (requestId, ts, record) VALUES (?, ?, ?)",
                (record["requestId"], record["ts"], json.dumps(record, ensure_ascii=False)),
            )
    except (sqlite3.Error, OSError):
        log.warning("analyze_log 기록 실패")
