from __future__ import annotations

import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

CONTRACT = "contracts/main.py"

@pytest.fixture(autouse=True)
def reset_genvm_contract():
    try:
        import genlayer.gl.genvm_contracts as gvc
        gvc.__known_contract__ = None
    except Exception:
        pass
