import { MOODS, type Mood } from "@finni/shared";

/** Shown when Finn's reply has no chips (and on the fallback reply). The app mirrors these. */
export const DEFAULT_CHIPS = ["What’s due?", "Check charges", "How’s my card?"];

const MAX_CHIPS = 3;
const MAX_CHIP_LENGTH = 28;

/** Splits Finn's raw reply into its leading `[mood:x]`, the text, and a trailing `[chips: a | b | c]`. */
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

  // Strip any stray tags the model repeats mid-reply.
  text = text.replace(/\[mood:\s*\w+\s*\]/gi, "").replace(/\[chips:[^\]]*\]/gi, "").trim();
  return { mood, text, chips: chips.length ? chips : DEFAULT_CHIPS };
}
