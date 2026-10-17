import { MOODS, type Mood } from "@finni/shared";

/** Shown when Finn's reply has no chips (and on the fallback reply). The app mirrors these. */
export const DEFAULT_CHIPS = ["What’s due?", "Check charges", "How’s my card?"];

const MAX_CHIPS = 3;
const MAX_CHIP_LENGTH = 28;

/** Splits Finn's raw reply into its leading `[mood:x]`, the text, and a trailing `[chips: a | b | c]`. */
/** "[get_goals]" / "[make_chart(...)]": a tool name written as text instead of called. */
const TOOL_TAG = /\[\s*(?:get|propose|make|find|spending)_[a-z_]*(?:\([^\]]*\))?\s*\]/gi;

/**
 * True when the model answered by naming one of its tools instead of calling it (flash-lite does
 * this sometimes, especially after a long text-only history). The loop then asks it to call the tool.
 */
export function namesToolInsteadOfCalling(raw: string, toolNames: readonly string[]): boolean {
  return toolNames.some((name) => new RegExp(`\\b${name}\\b`).test(raw));
}

export function parseReply(raw: string): { mood: Mood; text: string; chips: string[] } {
  const m = raw.match(/^\s*\[mood:\s*(\w+)\s*\]\s*/i);
  const mood = (m && (MOODS as readonly string[]).includes(m[1].toLowerCase()) ? m[1].toLowerCase() : "happy") as Mood;
  let text = m ? raw.slice(m[0].length) : raw;

  const c = text.match(/\[chips:\s*([^\]]*)\]\s*$/i);
  const chips = c
    ? c[1]
        .split("|")
        .map((x) => x.trim().slice(0, MAX_CHIP_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_CHIPS)
    : [];
  if (c) text = text.slice(0, c.index);

  // Strip any stray tags the model repeats mid-reply, including tool names it wrote instead of calling.
  text = text.replace(/\[mood:\s*\w+\s*\]/gi, "").replace(/\[chips:[^\]]*\]/gi, "").replace(TOOL_TAG, "").trim();
  return { mood, text, chips: chips.length ? chips : DEFAULT_CHIPS };
}
