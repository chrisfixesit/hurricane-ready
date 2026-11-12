/**
 * Tests for toPlainText: the dashboard shows the briefing with textContent
 * and the push uses its first line, so Markdown from the model would show up
 * raw ("# HURRICANE BERYL", "**What is happening**"). The prompt asks for
 * plain text; this strips whatever Markdown still gets through.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toPlainText, pushSummary } from "../src/briefing.mjs";

test("strips heading markers and bold/italic markers", () => {
  const md = "# Hurricane Beryl\n\n**What is happening**\n\nBeryl is *near* and __strong__.";
  assert.equal(
    toPlainText(md),
    "Hurricane Beryl\n\nWhat is happening\n\nBeryl is near and strong.",
  );
});

test("turns bullet markers into dashes and keeps the text", () => {
  assert.equal(toPlainText("* Fill water\n+ Charge phones\n- Secure items"),
    "- Fill water\n- Charge phones\n- Secure items");
});

test("leaves plain template text unchanged", () => {
  const plain = "Beryl is forecast to pass near Barbados.\n\n- Review your plan\n- Check your kit";
  assert.equal(toPlainText(plain), plain);
});

test("drops horizontal rules and collapses the blank lines they leave", () => {
  assert.equal(toPlainText("One.\n\n---\n\nTwo."), "One.\n\nTwo.");
});

test("keeps hyphens and asterisks inside words and numbers", () => {
  assert.equal(toPlainText("Category 4 hurricane, 2-3 days, 5*2"), "Category 4 hurricane, 2-3 days, 5*2");
});

test("the push line after cleaning is the sentence, not a heading marker", () => {
  const md = "**Beryl is forecast to pass about 280 km to the south of Barbados.**\n\nMore text.";
  assert.equal(pushSummary(toPlainText(md)), "Beryl is forecast to pass about 280 km to the south of Barbados.");
});
