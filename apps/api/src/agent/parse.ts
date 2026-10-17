import { MOODS, type Mood } from "@finni/shared";

/** Shown when Finn's reply has no chips (and on the fallback reply). The app mirrors these. */
export const DEFAULT_CHIPS = ["What’s due?", "Check charges", "How’s my card?"];

const MAX_CHIPS = 3;
const MAX_CHIP_LENGTH = 28;
export const REPLY_FAILURE = "I couldn't finish that request. Please try again.";

/** Keep Finn's copy plain, including flags, skin tones, keycaps and joined emoji. */
export const withoutEmoji = (text: string) => text
  .replace(/[0-9#*]\uFE0F?\u20E3/gu, '')
  .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200D\uFE0F\u20E3]/gu, '')
  .replace(/[ \t]+/g, ' ').replace(/ +([,.!?;:])/g, '$1').trim();

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
  // Some model versions return the requested fields as JSON instead of tagged prose.
  const candidate = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (candidate.startsWith('{') || candidate.startsWith('[') && !/^\[(?:mood|chips):/i.test(candidate)) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value.text === 'string' && !value.functionCall && !value.args) {
        const mood = (MOODS as readonly string[]).includes(value.mood) ? value.mood : 'happy';
        const chips = Array.isArray(value.chips) ? value.chips.filter((x: unknown): x is string => typeof x === 'string').map(withoutEmoji).filter(Boolean).slice(0, MAX_CHIPS).map((x: string) => x.slice(0, MAX_CHIP_LENGTH)) : [];
        return { mood, text: withoutEmoji(value.text) || REPLY_FAILURE, chips: chips.length ? chips : DEFAULT_CHIPS };
      }
    } catch { /* Incomplete JSON is not user-facing prose. */ }
    return { mood: 'worried', text: REPLY_FAILURE, chips: DEFAULT_CHIPS };
  }
  const m = raw.match(/^\s*\[mood:\s*(\w+)\s*\]\s*/i);
  const mood = (m && (MOODS as readonly string[]).includes(m[1].toLowerCase()) ? m[1].toLowerCase() : "happy") as Mood;
  let text = m ? raw.slice(m[0].length) : raw;

  const c = text.match(/\[chips:\s*([^\]]*)\]\s*$/i);
  const chips = c
    ? c[1]
        .split("|")
        .map((x) => withoutEmoji(x).slice(0, MAX_CHIP_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_CHIPS)
    : [];
  if (c) text = text.slice(0, c.index);

  // Strip any stray tags the model repeats mid-reply, including tool names it wrote instead of calling.
  text = text.replace(/\[mood:\s*\w+\s*\]/gi, "").replace(/\[chips:[^\]]*\]/gi, "").replace(TOOL_TAG, "").trim();
  // Never render an unexecuted tool invocation, including unbracketed calls.
  if (/\b(?:get|propose|make|find|spending)_[a-z_]+\s*\(/i.test(text) || /```|"(?:functionCall|target_amount|functionResponse)"\s*:/.test(text)) text = REPLY_FAILURE;
  return { mood, text: withoutEmoji(text) || REPLY_FAILURE, chips: chips.length ? chips : DEFAULT_CHIPS };
}
