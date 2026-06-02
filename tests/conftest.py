"""Shared test fixtures.

The Windows tempfile cleanup fixture works around a race in genlayer-test where
the SDK loader writes a message file to fd 0, then unlinks the path while the
handle is still open. Windows refuses the unlink (PermissionError) and the test
collection blows up. Defer those deletions to the end of the test.
"""
import os

import pytest


@pytest.fixture(autouse=True)
def allow_genlayer_test_tempfile_cleanup_on_windows(monkeypatch):
    pending = []
    original_unlink = os.unlink

    def safe_unlink(path):
        try:
            original_unlink(path)
        except PermissionError:
            pending.append(path)

    monkeypatch.setattr(os, "unlink", safe_unlink)
    yield
    for path in pending:
        try:
            original_unlink(path)
        except OSError:
            pass
