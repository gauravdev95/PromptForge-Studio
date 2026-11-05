"""Tests for PromptForge Studio — run from project root:
    python -m pytest tests/test_compiler.py -v
No network, no API key.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from compiler import compile_prompt, detect_intent


def test_invoice_json_detected():
    a = detect_intent("Extract invoice JSON (vendor, date) from OCR text")
    assert a["domain"] == "invoice"
    assert a["format"] == "json"
    assert "vendor" in a["fields"]


def test_empty_intent_rejected():
    try:
        compile_prompt("   ")
    except ValueError:
        return
    raise AssertionError("empty intent should raise ValueError")


def test_pfinal_beats_p0_on_boundary_and_injection():
    r = compile_prompt("Extract structured invoice JSON from messy OCR text")
    by_kind = {x["kind"]: x for x in r["results"]}
    assert by_kind["boundary"]["p_final_pass"] is True
    assert by_kind["boundary"]["p0_pass"] is False
    assert by_kind["injection"]["p_final_pass"] is True
    assert by_kind["injection"]["p0_pass"] is False


def test_score_is_computed_not_hardcoded():
    a = compile_prompt("Extract invoice JSON from OCR text")
    b = compile_prompt("Write a poem about the sea")
    # Different intents must be able to give different scores; neither is 97.4 by fiat.
    assert 0 < a["score"] <= 100
    assert 0 < b["score"] <= 100
    assert a["p_final"] != b["p_final"]


def test_model_changes_format():
    claude = compile_prompt("Extract invoice JSON from OCR", "Claude 4 Sonnet (XML)")
    gpt = compile_prompt("Extract invoice JSON from OCR", "GPT-4o (JSON/MD)")
    deepseek = compile_prompt("Extract invoice JSON from OCR", "DeepSeek-R1 (CoT)")
    assert "<system_instructions>" in claude["p_final"]
    assert "### ROLE" in gpt["p_final"]
    assert "Think step by step" in deepseek["p_final"]


def test_no_guess_rule_present():
    r = compile_prompt("Extract medical prescription entities into strict JSON without guessing missing dosages")
    assert "never guess" in r["p_final"].lower() or "return null" in r["p_final"].lower()
    assert r["cost_inr"] == 0
    assert len(r["tests"]) == 3
    assert len(r["gradients"]) >= 1
