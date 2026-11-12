/**
 * Tests for looksConsistentWithLevel (issue #52).
 *
 * The system prompt instructs Claude to NEVER change the threat level
 * the engine decided. But a prompt-injection attempt smuggled in via
 * NHC text (or a model that drifts) could write a briefing that
 * announces the wrong level. Validate at output time: if any UPPERCASE
 * level token *other* than the expected one appears in the text,
 * treat the briefing as drifted and fall back to the deterministic
 * template.
 *
 * Conservative on purpose: lowercase "warning" / "watch" are normal
 * English (e.g. "fair warning", "watch for puddles") and don't trip.
 * Only the explicit UPPERCASE level tokens, which Claude has no reason
 * to write naturally, count as a deviation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { looksConsistentWithLevel } from "../src/briefing.mjs";

test("accepts an empty / null / undefined text gracefully", () => {
  assert.equal(looksConsistentWithLevel("", "WATCH"), false);
  assert.equal(looksConsistentWithLevel(null, "WATCH"), false);
  assert.equal(looksConsistentWithLevel(undefined, "WATCH"), false);
});

test("accepts a briefing that doesn't mention any level keyword in uppercase", () => {
  assert.equal(looksConsistentWithLevel(
    "Beryl is forecast to pass about 130 km to the south. Strong winds and heavy rain are expected.",
    "WARNING",
  ), true);
});

test("accepts a briefing that mentions ONLY the expected level (uppercase)", () => {
  assert.equal(looksConsistentWithLevel("This is a WARNING. Finish preparations.", "WARNING"), true);
  assert.equal(looksConsistentWithLevel("ALL_CLEAR — no active threat.", "ALL_CLEAR"), true);
  assert.equal(looksConsistentWithLevel("ALL CLEAR (no spaces / underscore variant).", "ALL_CLEAR"), true);
});

test("rejects a briefing that announces a DIFFERENT level (uppercase keyword)", () => {
  // Engine said WARNING but Claude (or an injected NHC blurb) wrote WATCH.
  assert.equal(looksConsistentWithLevel("This is a WATCH situation, prepare moderately.", "WARNING"), false);
  // Engine said WATCH but text claims IMMINENT.
  assert.equal(looksConsistentWithLevel("IMMINENT impact within 24 hours.", "WATCH"), false);
  // Engine said IMMINENT but text says ALL_CLEAR (massive drift).
  assert.equal(looksConsistentWithLevel("ALL_CLEAR — nothing to worry about.", "IMMINENT"), false);
});

test("lowercase 'warning' / 'watch' in normal prose does not trip the detector", () => {
  // Common English usage that shouldn't be flagged.
  assert.equal(looksConsistentWithLevel("A warning sign to watch for is rising tides.", "ALL_CLEAR"), true);
  assert.equal(looksConsistentWithLevel("Watch your supplies; ration water carefully.", "IMMINENT"), true);
});

test("matches word-boundary only — substrings of larger words do not trip", () => {
  // "OVERWATCH" or "FOREWARNING" shouldn't be flagged as a level token.
  assert.equal(looksConsistentWithLevel("OVERWATCH was unusual that night.", "ALL_CLEAR"), true);
  assert.equal(looksConsistentWithLevel("FOREWARNING signs were everywhere.", "ALL_CLEAR"), true);
});

test("rejects a lowercase 'all clear' when the level is not ALL_CLEAR", () => {
  assert.equal(looksConsistentWithLevel("Conditions are all clear.", "WARNING"), false);
  assert.equal(looksConsistentWithLevel("It is all-clear now.", "IMMINENT"), false);
  assert.equal(looksConsistentWithLevel("Conditions are all clear.", "ALL_CLEAR"), true);
});
