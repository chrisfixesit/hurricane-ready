/**
 * AI briefing layer. Claude on Bedrock explains the threat decision in
 * calm, plain language. It NEVER decides the level - threat.mjs does.
 * Falls back to solid templates when Bedrock is unavailable.
 */
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const SYSTEM = `You write public hurricane-preparedness briefings for residents of a Caribbean island. You receive a threat assessment computed by deterministic software, plus raw storm data.

Hard rules:
- NEVER change, second-guess, or restate a different threat level than the one provided. The level is decided by software, not by you.
- Calm, clear, practical. No drama, no minimizing. Short sentences. Plain words.
- Most storms do NOT make a direct hit — they pass nearby. When the data shows a storm passing to one side (its "pass" has a side and distance), say so plainly, e.g. "Beryl is forecast to pass about 130 km to the south." Make clear that a nearby pass still brings strong winds, heavy rain, and dangerous seas — being missed by the centre is not the same as being safe.
- Structure: 1) what is happening, including where it will pass and how close, in one or two sentences; 2) what this level means for the island; 3) a checklist of 4-6 actions appropriate to THIS level only; 4) one line on when the next update is expected.
- The first line is sent on its own as a phone notification. Make it one complete plain sentence that says what is happening (e.g. "Hurricane Beryl is forecast to pass about 280 km south of Barbados on Tuesday."), never a title or heading.
- Never write level codes in capitals (ALL_CLEAR, WATCH, WARNING, IMMINENT). Describe the level in plain lowercase words. Use the phrase "all clear" only when the level is ALL_CLEAR.
- Use these quantities exactly and do not invent others: drinking water is 1 gallon (about 4 litres) per person per day, for at least 3 days.
- End with: "Always follow official guidance from Barbados Meteorological Services and the Department of Emergency Management."
- Keep it under 220 words. Plain text only: no Markdown, no headings, no # or * characters, no bold. Use simple dashes for the checklist.`;

const PASS_PHRASE = (pass) => {
  if (!pass || pass.kind === "distant") return "";
  if (pass.kind === "direct-hit-risk") return ` The centre may track very close to the island.`;
  return ` It is forecast to pass about ${pass.distanceKm} km to the ${pass.side}, but a nearby pass still brings strong winds, heavy rain, and dangerous seas.`;
};

const TEMPLATES = {
  ALL_CLEAR: (island) =>
    `No active tropical systems currently threaten ${island}. No action is needed beyond normal seasonal readiness: know your shelter locations, keep documents in a waterproof container, and maintain a basic supply kit.\n\nAlways follow official guidance from Barbados Meteorological Services and the Department of Emergency Management.`,
  WATCH: (island, s) =>
    `A tropical system (${s?.name ?? "unnamed"}) is active in the Atlantic basin. It poses no immediate threat to ${island}, but conditions can change.\n\n- Review your family emergency plan\n- Check your supply kit: water, food, medication, batteries\n- Note your nearest shelter and route\n- Keep phones charged and follow daily updates\n\nAlways follow official guidance from Barbados Meteorological Services and the Department of Emergency Management.`,
  WARNING: (island, s) =>
    `${s?.name ?? "A storm"} is forecast to pass near ${island}. Preparations should be completed soon.\n\n- Complete shopping now: water (1 gallon per person per day), non-perishables, medication\n- Secure loose outdoor items and shutters\n- Fill vehicle tanks and charge power banks\n- Prepare important documents to carry\n- Confirm arrangements for elderly or vulnerable family members\n\nAlways follow official guidance from Barbados Meteorological Services and the Department of Emergency Management.`,
  IMMINENT: (island, s) =>
    `${s?.name ?? "A storm"} is expected to affect ${island} within roughly 48 hours or is already nearby. Finish preparations and be ready to shelter.\n\n- Stay indoors away from windows once conditions deteriorate\n- Move to your safe room or shelter if instructed\n- Do not go outside during the eye calm\n- Keep radio or phone on official channels\n- Check on neighbours only while it is safe\n\nAlways follow official guidance from Barbados Meteorological Services and the Department of Emergency Management.`,
};

/**
 * Bedrock output validation (issue #52).
 *
 * The system prompt orders Claude to never change the engine's level —
 * but a prompt-injection attempt smuggled in via NHC text (or a model
 * that drifts) could announce the wrong level in the briefing. Validate
 * the output: if any UPPERCASE level token OTHER than the engine's
 * decision appears, treat the briefing as drifted and the caller falls
 * back to the deterministic template.
 *
 * Conservative on purpose: lowercase "watch" / "warning" / "imminent" are
 * normal English, so only their UPPERCASE tokens count as a deviation.
 * "all clear" counts in any case: it is not everyday wording, and saying it
 * at a higher level is exactly the drift this guards against.
 */
const LEVEL_PATTERNS = [
  // "all clear" is checked in any case: unlike watch/warning it is not
  // ordinary English, and the prompt asks for lowercase level words.
  ["ALL_CLEAR", /\ball[_ -]?clear\b/i],
  ["WATCH",     /\bWATCH\b/],
  ["WARNING",   /\bWARNING\b/],
  ["IMMINENT",  /\bIMMINENT\b/],
];

export function looksConsistentWithLevel(text, expectedLevel) {
  if (!text || typeof text !== "string") return false;
  for (const [name, re] of LEVEL_PATTERNS) {
    if (name === expectedLevel) continue;
    if (re.test(text)) return false;
  }
  return true;
}

/**
 * The dashboard shows the briefing with textContent and push uses its first
 * line, so Markdown would show up raw. The prompt asks for plain text; this
 * strips whatever still gets through: heading markers, bold/italic markers,
 * horizontal rules, and * / + bullets (turned into the template's dashes).
 */
export function toPlainText(text) {
  const lines = String(text ?? "").split("\n").map((line) =>
    /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)
      ? ""
      : line.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/^(\s*)[*+]\s+/, "$1- ")
  );
  return lines
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^\w*])\*([^*\s][^*\n]*?)\*(?![\w*])/gm, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The push notification body: the briefing's first non-blank line, capped at
 * PUSH_SUMMARY_MAX characters. Template briefings open with one short
 * sentence, but Claude's first line can run long. Keep as many whole sentences
 * as fit; failing that, cut on a word boundary and add an ellipsis.
 */
export const PUSH_SUMMARY_MAX = 180;

export function pushSummary(briefing) {
  const line = (briefing ?? "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  if (line.length <= PUSH_SUMMARY_MAX) return line;
  let kept = "";
  // A sentence ends at . ! or ? followed by a space or the end, so "4.5" stays whole.
  for (const [sentence] of line.matchAll(/.+?[.!?]+(?=\s|$)/g)) {
    if ((kept + sentence).trim().length > PUSH_SUMMARY_MAX) break;
    kept += sentence;
  }
  if (kept.trim()) return kept.trim();
  const cut = line.slice(0, PUSH_SUMMARY_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).trimEnd() + "…";
}

export function templateBriefing(level, islandName, primaryStorm) {
  const base = TEMPLATES[level](islandName, primaryStorm);
  const pass = primaryStorm?.assessment?.pass;
  const phrase = PASS_PHRASE(pass);
  if (!phrase) return base;
  // Insert the pass detail after the first sentence.
  const dot = base.indexOf(". ");
  return dot > 0 ? base.slice(0, dot + 1) + phrase + base.slice(dot + 1) : phrase.trim() + "\n\n" + base;
}

export async function generateBriefing(assessment, island, bedrockConfig) {
  const primary = assessment.storms.find(
    (s) => s.assessment.level === assessment.overall
  );

  if (!bedrockConfig.enabled) {
    return {
      text: templateBriefing(assessment.overall, island.name, primary),
      source: "template",
    };
  }

  try {
    const client = new BedrockRuntimeClient({ region: bedrockConfig.region });
    const excerpt = primary?.advisoryExcerpt
      ? `\n\nOfficial NHC forecast advisory excerpt (for accurate detail; the computed level above still stands):\n${primary.advisoryExcerpt}`
      : "";
    const stormData = assessment.storms.map(
      ({ advisoryExcerpt, ...s }) => s
    );
    const result = await client.send(
      new ConverseCommand({
        modelId: bedrockConfig.modelId,
        system: [{ text: SYSTEM }],
        messages: [
          {
            role: "user",
            content: [
              {
                text: `Island: ${island.name}\nComputed threat level (do not alter): ${assessment.overall}\n\nStorm data:\n${JSON.stringify(stormData, null, 2)}${excerpt}\n\nWrite the briefing.`,
              },
            ],
          },
        ],
        inferenceConfig: { maxTokens: 500, temperature: 0.3 },
      })
    );
    const text = toPlainText(
      result.output?.message?.content?.map((c) => c.text ?? "").join("") ?? ""
    );
    if (!text) throw new Error("empty briefing");
    // Output validation (#52): if the briefing announces a level different
    // from the engine's decision (prompt-injection from NHC text, model
    // drift), fall back to the deterministic template rather than ship
    // mis-labeled safety guidance.
    if (!looksConsistentWithLevel(text, assessment.overall)) {
      console.warn(
        `Briefing mentions a level inconsistent with the engine's decision (${assessment.overall}); using template`,
      );
      return {
        text: templateBriefing(assessment.overall, island.name, primary),
        source: "template",
      };
    }
    return { text, source: "claude" };
  } catch (err) {
    console.warn(`Bedrock briefing failed (${err.name}); using template`);
    return {
      text: templateBriefing(assessment.overall, island.name, primary),
      source: "template",
    };
  }
}
