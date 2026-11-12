/**
 * Tests for pushSummary: the one line of the briefing a push notification
 * shows. Template briefings open with one short sentence, but a Claude-written
 * briefing can open with a long line, a blank line, or a heading, so the push
 * body is capped and always ends on a whole word.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pushSummary, PUSH_SUMMARY_MAX } from "../src/briefing.mjs";

test("returns a short first line unchanged", () => {
  assert.equal(
    pushSummary("Beryl is forecast to pass 130 km to the south.\n\n- Check your kit"),
    "Beryl is forecast to pass 130 km to the south.",
  );
});

test("skips leading blank lines", () => {
  assert.equal(pushSummary("\n\n  Kirk is active.  \nMore"), "Kirk is active.");
});

test("handles empty, null and undefined", () => {
  assert.equal(pushSummary(""), "");
  assert.equal(pushSummary(null), "");
  assert.equal(pushSummary(undefined), "");
});

test("keeps whole sentences that fit when the first line is long", () => {
  const first = "Hurricane Kirk is about 300 km east of the island and moving west.";
  const second = " It is forecast to pass about 90 km to the north on Thursday, bringing strong winds, heavy rain and rough seas to all coasts, with the worst conditions overnight.";
  const out = pushSummary(first + second);
  assert.equal(out, first);
});

test("cuts on a word boundary with an ellipsis when no sentence fits", () => {
  const long = "word ".repeat(80).trim();
  const out = pushSummary(long);
  assert.ok(out.length <= PUSH_SUMMARY_MAX, `length ${out.length}`);
  assert.ok(out.endsWith("…"));
  assert.ok(!out.slice(0, -1).endsWith(" "));
  assert.match(out.slice(0, -1), /(^|\s)word$/);
});

test("never exceeds the cap for any input", () => {
  for (const text of [
    "x".repeat(500),
    "A. ".repeat(200),
    "Short. " + "y".repeat(400),
  ]) {
    assert.ok(pushSummary(text).length <= PUSH_SUMMARY_MAX);
  }
});

test("does not split a sentence at a decimal point", () => {
  const long = "Waves may reach 4.5 metres " + "along exposed coasts ".repeat(10) + ".";
  const out = pushSummary(long);
  assert.ok(out.startsWith("Waves may reach 4.5 metres"), out);
  assert.ok(out.length <= PUSH_SUMMARY_MAX);
});

test("keeps a sentence that contains a decimal when it fits", () => {
  const first = "Beryl is 4.5 hours away and moving west at 25 km/h.";
  const out = pushSummary(first + " " + "x ".repeat(100));
  assert.equal(out, first);
});
