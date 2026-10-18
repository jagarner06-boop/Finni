// Decides whether this chat turn may create approval requests (propose_* tools). Finn can always
// *suggest* a payment, but only the user asking — or saying yes to Finn's offer — creates one.
// Advice questions ("what's best for my finances next?") used to come back with a real Pay request.

// Verbs that ask Finn to do something with money or goals.
const ACTION =
  /\b(pay(?:ing)?(?: (?:it|off|down|that|this|my|the))?|move|transfer|send|put|add|deposit|save|cancel|dispute|refund|stop|start|make|create|set(?:ting)? up|open|max(?:ed)? out|top up|fund|get (?:it|that|this|my|the)?.*\bback|approve|contribute|split)\b/i;

// The verb is about information, not an instruction: "how much did I pay", "what did I spend".
const QUESTION =
  /^\s*(?:how|what|when|where|which|who|why|did|do|does|have|has|is|are|was|were)\b(?![^?]*\b(?:can you|could you|will you|would you|please)\b)/i;

const YES = /^\s*(?:yes|yeah|yep|yup|sure|ok(?:ay)?|do it|go ahead|go for it|please(?: do)?|sounds good|let'?s do it|absolutely|y)\b[\s.!]*$/i;

// Finn offered to set something up in his previous reply.
const OFFER = /\b(?:want me to|would you like(?: me)? to|should i|shall i|i can (?:set|pay|move|propose|cancel|get|start|make|put|dispute|send)|do you want me to)\b/i;

/** True when this message asks Finn to act, or accepts an offer Finn just made. */
export function wantsAction(message: string, lastFinnText: string | null): boolean {
  const m = message.trim();
  if (YES.test(m)) return !!lastFinnText && OFFER.test(lastFinnText);
  if (QUESTION.test(m)) return false;
  return ACTION.test(m);
}
