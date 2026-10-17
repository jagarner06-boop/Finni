// Finn's reaction GIFs (or animated WebP, which has smoother edges). Files live in
// assets/finn/reactions/. Each plays once when an animated FinnAvatar changes to that mood or face,
// then settles back on the static head. Missing reactions just keep the static head.
//
// Spec: 512×512, framed exactly like the matching head; 12–15 fps; 1–2 s; first and last frame =
// the static head so swaps don't jump. From numbered PNG frames: `npm run finn:gif -- <mood>`.

export type ReactionName = 'happy' | 'thinking' | 'worried' | 'celebrating' | 'love' | 'sad' | 'surprised' | 'skeptical';

export interface Reaction {
  source: number;
  /** One play-through, in ms; Finn returns to the static head after this. */
  durationMs: number;
}

export const FINN_REACTIONS: Partial<Record<ReactionName, Reaction>> = {
  // happy: { source: require('../../../assets/finn/reactions/happy.gif'), durationMs: 1200 },
};
