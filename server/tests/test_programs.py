import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import main
from services.programs import DEFAULT_PATH, get_program, load_programs


def test_loads_14_programs():
    pf = load_programs()
    assert len(pf.programs) == 14
    assert get_program("S02").eligibility.variants is not None
    assert get_program("ZZZ") is None


def test_broken_json_raises(tmp_path: Path):
    bad = tmp_path / "p.json"
    bad.write_text("{ not json", encoding="utf-8")
    with pytest.raises(ValueError):
        load_programs(bad)


def test_invalid_schema_raises(tmp_path: Path):
    d = json.loads(DEFAULT_PATH.read_text(encoding="utf-8"))
    d["programs"][0]["kind"] = "gift"
    bad = tmp_path / "p.json"
    bad.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(ValidationError):
        load_programs(bad)


def test_missing_file_raises(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        load_programs(tmp_path / "none.json")


def test_startup_fails_on_bad_data(monkeypatch):
    def boom():
        raise ValueError("bad")

    monkeypatch.setattr(main, "load_programs", boom)
    with pytest.raises(ValueError), TestClient(main.app):
        pass


def test_endpoints():
    with TestClient(main.app) as c:
        r = c.get("/programs")
        assert r.status_code == 200
        assert len(r.json()["programs"]) == 14
        r = c.get("/programs/S01")
        assert r.status_code == 200 and r.json()["id"] == "S01"
        r = c.get("/programs/X99")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "program_not_found"
