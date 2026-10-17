import { loopFrame } from '../onboardingLoops';
it('matches the thinking bob keyframes from the motion handoff', () => {
  expect(loopFrame('bob', 0).y).toBeCloseTo(0);
  expect(loopFrame('bob', 0).rotation).toBeCloseTo(0);
  expect(loopFrame('bob', 0.25)).toEqual({ y: -4, rotation: -6 });
  expect(loopFrame('bob', 0.75)).toEqual({ y: -2, rotation: 5 });
  expect(loopFrame('bob', 1)).toEqual({ y: 0, rotation: 0 });
});
