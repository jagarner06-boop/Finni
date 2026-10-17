// Names inside assets/rive/finn.riv (source: animations/finn/build/finn.riv). To re-check after
// editing the file, run @rive-app/react-native's `rive-gen-types <file> --out schema.ts`
// (it needs @rive-app/canvas available).

import finnRive from '../../../assets/rive/finn.riv';

export const FINN_RIVE_FILE = finnRive;

export const FINN_RIVE = {
  head: { artboard: 'FinnHead', stateMachine: 'Finn', viewModel: 'Finn' },
  body: { artboard: 'FinnBody', stateMachine: 'State Machine 1', viewModel: 'FinnBody' },
  // Finn (head) view model
  mood: 'mood', // enum FinnMood: happy | thinking | worried | celebrating | sad | skeptical | surprised | love | ...
  nod: 'nod',
  hop: 'hop',
  bob: 'bob',
  // FinnBody view model
  wave: 'wave',
  hidden: 'hidden',
} as const;

export type FinnHeadTrigger = 'nod' | 'hop' | 'bob';
