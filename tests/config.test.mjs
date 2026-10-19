import test from "node:test";
import assert from "node:assert/strict";
import { isValidContractAddress } from "../src/lib/config.ts";

test("isValidContractAddress accepts valid 20-byte 0x hex addresses", () => {
  assert.equal(
    isValidContractAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"),
    true
  );
  assert.equal(
    isValidContractAddress("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"),
    true
  );
});

test("isValidContractAddress rejects zero address", () => {
  assert.equal(
    isValidContractAddress("0x0000000000000000000000000000000000000000"),
    false
  );
});

test("isValidContractAddress rejects malformed or incomplete addresses", () => {
  assert.equal(isValidContractAddress(""), false);
  assert.equal(isValidContractAddress("0x123"), false);
  assert.equal(isValidContractAddress("not-an-address"), false);
  assert.equal(isValidContractAddress(null), false);
  assert.equal(isValidContractAddress(undefined), false);
  assert.equal(isValidContractAddress("0xZZZZ7970C51812dc3A010C7d01b50e0d17dc79C8"), false);
});
