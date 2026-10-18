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

/**
 * True when Finn says he completed something with money ("I've paid your bill", "Done! Moved $50").
 * He never can: every money move is a proposal the user approves, so this is always a hallucination.
 * "I've proposed paying it" / "I've set that up for you to review" are fine.
 */
const I_DID = /\bI(?:'ve| have)?\s+(?:just\s+|already\s+|now\s+)?(?:paid|sent|transferred|moved|deposited|cancell?ed|refunded|disputed|withdrew|added|put|contributed|funded)\b/i;
const DONE = /^\s*(?:done|all done|paid|sent)\b\s*[!.,:]/i;
const IT_IS_DONE = /\b(?:is|has been|have been) (?:now )?(?:paid|sent|transferred|cancell?ed|refunded)\b(?! once you approve| when you approve| after you approve)/i;

export function claimsCompletedAction(text: string): boolean {
  return I_DID.test(text) || DONE.test(text) || IT_IS_DONE.test(text);
}

/** True when Finn says an approval is ready ("I've set up the payment… Tap Review"). Checked against what was actually created. */
const SAYS_PROPOSED = /\b(?:tap review|i(?:'ve| have) (?:set (?:it|that|this|up)|proposed|prepared|created a (?:proposal|request))|set (?:it|that) up for you to (?:review|approve)|ready for you to (?:review|approve))\b/i;

export function claimsProposal(text: string): boolean {
  return SAYS_PROPOSED.test(text);
}

/**
 * Finn's bubble shows plain text, so Markdown would appear as raw symbols (it once answered with a
 * "| Account | Balance |" table). Tables are dropped (the cards show that data), list markers and
 * emphasis are removed, and lines are joined into sentences.
 */
export function plainText(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*\|.*\|\s*$/.test(line)) // table rows and separators
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "") // headings
        .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "") // list markers
        .replace(/(\*\*|__)(.+?)\1/g, "$2") // bold
        .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, "$1$2") // italics
        .replace(/`([^`]*)`/g, "$1") // inline code
        .trim(),
    )
    .filter(Boolean)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  // Stray tags (including tool names written instead of called), then Markdown: the bubble shows plain text.
  text = plainText(text.replace(/\[mood:\s*\w+\s*\]/gi, '').replace(/\[chips:[^\]]*\]/gi, '').replace(TOOL_TAG, ''));
  const internal = (value: string) => /^[{[]/.test(value) && !/^\[[^\]]+\]/.test(value)
    || /```|\b(?:get|propose|make|find|spending)_[a-z_]+\b|"(?:args|functionCall|functionResponse|target_amount)"\s*:/.test(value);
  if (internal(text)) text = REPLY_FAILURE;
  chips = chips.map(withoutEmoji).filter((x) => x && !internal(x)).slice(0, MAX_CHIPS).map((x) => x.slice(0, MAX_CHIP_LENGTH));
  return { mood, text: withoutEmoji(text) || REPLY_FAILURE, chips: chips.length ? chips : DEFAULT_CHIPS };
}
