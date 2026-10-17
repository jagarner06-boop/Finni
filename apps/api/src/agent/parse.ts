import { MOODS, type Mood } from "@finni/shared";

/** Shown when Finn's reply has no chips (and on the fallback reply). The app mirrors these. */
export const DEFAULT_CHIPS = ["What’s due?", "Check charges", "How’s my card?"];

const MAX_CHIPS = 3;
const MAX_CHIP_LENGTH = 28;
export const REPLY_FAILURE = "I couldn't finish that request. Please try again.";

export { withoutEmoji } from '@finni/shared';
import { withoutEmoji } from '@finni/shared';

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
  let mood = (m && (MOODS as readonly string[]).includes(m[1].toLowerCase()) ? m[1].toLowerCase() : 'happy') as Mood;
  let text = (m ? raw.slice(m[0].length) : raw).trim();
  let chips: string[] = [];
  const candidate = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (/^[{[]/.test(candidate) && !/^\[(?:mood|chips):/i.test(candidate)) {
    try {
      const value = JSON.parse(candidate);
      if (!value || typeof value.text !== 'string' || value.functionCall || value.args) throw new Error('Not a reply');
      text = value.text;
      if ((MOODS as readonly string[]).includes(value.mood)) mood = value.mood;
      if (Array.isArray(value.chips)) chips = value.chips.filter((x: unknown): x is string => typeof x === 'string');
    } catch {
      return { mood: 'worried', text: REPLY_FAILURE, chips: DEFAULT_CHIPS };
    }
  }
  const c = text.match(/\[chips:\s*([^\]]*)\]\s*$/i);
  if (c) { chips = c[1].split('|'); text = text.slice(0, c.index); }
  text = text.replace(/\[mood:\s*\w+\s*\]/gi, '').replace(/\[chips:[^\]]*\]/gi, '').replace(TOOL_TAG, '').trim();
  const internal = (value: string) => /^[{[]/.test(value) && !/^\[[^\]]+\]/.test(value)
    || /```|\b(?:get|propose|make|find|spending)_[a-z_]+\b|"(?:args|functionCall|functionResponse|target_amount)"\s*:/.test(value);
  if (internal(text)) text = REPLY_FAILURE;
  chips = chips.map(withoutEmoji).filter((x) => x && !internal(x)).slice(0, MAX_CHIPS).map((x) => x.slice(0, MAX_CHIP_LENGTH));
  return { mood, text: withoutEmoji(text) || REPLY_FAILURE, chips: chips.length ? chips : DEFAULT_CHIPS };
}
