import { claimsCompletedAction, claimsProposal, namesToolInsteadOfCalling } from "./parse.js";

// Checks on Finn's final answer before the user sees it. Finn can only *propose* money moves, so an
// answer that says otherwise is sent back once with a note, and replaced with a true line if it's
// still wrong.

export interface Turn {
  /** The user asked for an action this turn (agent/intent.ts). */
  canPropose: boolean;
  /** An approval request was actually created this turn. */
  proposed: boolean;
  toolNames: readonly string[];
}

/** What's wrong with this answer, as a note for the model, or null if it's fine. */
export function findProblem(raw: string, text: string, turn: Turn): string | null {
  if (namesToolInsteadOfCalling(raw, turn.toolNames)) return "You wrote a tool name instead of calling it. Call the tool, then answer.";
  if (claimsCompletedAction(text)) return "You can't move money yourself; you only set things up for the user to approve. Rewrite your answer without saying anything was paid, sent, moved or done. Don't apologize or mention this.";
  if (turn.canPropose && !turn.proposed && claimsProposal(text))
    return "You said you set something up but didn't call a propose tool, so there's nothing to review. Call the right propose tool now, then answer. Don't apologize or mention this.";
  return null;
}

/** A true line to show when the answer still claims something that didn't happen. */
export function honestText(text: string, turn: Turn): string {
  if (claimsCompletedAction(text) || (turn.canPropose && !turn.proposed && claimsProposal(text)))
    return turn.proposed ? "I've set that up for you to review. Tap Review to approve it." : "I can't do that myself, but I can set it up for you to approve. Just ask.";
  return text;
}
