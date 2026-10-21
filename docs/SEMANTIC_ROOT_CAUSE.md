# Semantic pipeline root cause

**Retrieved:** 2026-10-20  
**Old deployment:** `0xC8a83C62da126891aB8F60e6D5E171480aE91c23`  
**Pinned contract SDK:** `py-genlayer` stdlib from GenVM `v0.3.0-rc7`, declared by the contract `Depends` line.

## Confirmed facts

The pinned `exec_prompt` overload for `response_format="json"` returns `dict[str, Any]`. The implementation is `genlayer/gl/nondet/__init__.py` in that stdlib. The direct-test mock documents the same contract and JSON-decodes mocked strings before returning them.

`assess_amendment` did this:

```python
raw = gl.nondet.exec_prompt(prompt, response_format="json")
return str(raw)
```

`str` on a dict is Python's single-quoted representation, not JSON. `json.loads` of that text fails with:

`Expecting property name enclosed in double quotes: line 1 column 2 (char 1)`

That is the exact reasoning stored for `assess-1`, `assess-2`, and `assess-3`.

The comparative helper returns the leader function's value. The value that reached `_parse_and_verify_decision` was a string, because a dict would have raised `AttributeError` on `.strip()` outside the JSON handler and the transaction would not have stored this message. The stored message therefore means the `str(raw)` conversion ran.

Local semantic tests never called `exec_prompt`. They passed an already valid JSON string into `_parse_and_verify_decision`. That is why they stayed green.

## Not captured

The old transactions did not store the pre-conversion model value. This report does not invent that raw output. A provider that itself returned single-quoted text would produce the same `json.loads` error, but the contract conversion makes a correct dict return fail the same way. The conversion is sufficient to explain every stored failure.

## Repair requirement

Accept a dict directly. Decode a string once. Never parse `str(dict)`. A format, type, schema, provider, or grounding failure must stay distinct from a completed semantic `REVIEW_NEEDED`.

## Documentation check (2026-10-20)

GenLayer's Calling LLMs page states that `response_format="json"` yields a parsed dict and shows validators reading `leaders_res.calldata` as that object. The GenVM SDK schema says `ExecPrompt` with `response_format` `json` encodes `{"ok": Object}`. The pinned stdlib overload matches that contract. The local mock JSON-decodes a string before returning it, so a test that passed a JSON string into the parser never executed the `str(dict)` line.
