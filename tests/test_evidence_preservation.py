"""Prove gltest cleanup cannot delete persistent QA evidence."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "evidence"
SENTINEL = EVIDENCE / "SENTINEL"
CONFIG = ROOT / "gltest.config.yaml"


def test_sentinel_survives_session_cleanup():
    text = SENTINEL.read_text(encoding="utf-8").strip()
    assert text == "rulefreeze-evidence-sentinel"
    assert (EVIDENCE / "historical" / "live-qa-campaign.json").is_file()
    config = CONFIG.read_text(encoding="utf-8")
    assert "/tmp/rulefreeze-gltest-artifacts" in config
    assert "evidence" not in config.split("artifacts:", 1)[-1]


def test_rmtree_does_not_follow_symlink_to_evidence(tmp_path: Path):
    disposable = tmp_path / "artifacts"
    disposable.mkdir()
    (disposable / "disposable.txt").write_text("temp", encoding="utf-8")
    (disposable / "evidence-link").symlink_to(EVIDENCE)
    shutil.rmtree(disposable)
    assert SENTINEL.read_text(encoding="utf-8").strip() == "rulefreeze-evidence-sentinel"
    assert not disposable.exists()
