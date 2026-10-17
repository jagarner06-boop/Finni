import type { Mood } from '@finni/shared';
import { Fit, RiveView, useRiveBoolean, useRiveEnum, useRiveFile, useRiveTrigger, useViewModelInstance } from '@rive-app/react-native';
import { useEffect, useImperativeHandle, type ReactNode, type Ref } from 'react';
import { Platform, View } from 'react-native';

import { FINN_LABEL } from '@/components/finn/assets';
import { FINN_RIVE, FINN_RIVE_FILE, type FinnHeadTrigger } from '@/components/finn/rive';

export type FinnRiveHandle = { fire: (name: FinnHeadTrigger) => void };

/** Rive only runs natively; anything else (web, a load error, still loading) shows `fallback`. */
function useFinnFile() {
  const { riveFile, error } = useRiveFile(FINN_RIVE_FILE);
  return Platform.OS === 'web' || error ? null : riveFile;
}

/** Full-vector Finn head driven by mood, with nod/hop/bob triggers. */
export function FinnRiveHead({ mood, size, fallback, ref }: { mood: Mood; size: number; fallback: ReactNode; ref?: Ref<FinnRiveHandle> }) {
  const file = useFinnFile();
  const { instance } = useViewModelInstance(file, { viewModelName: FINN_RIVE.head.viewModel, async: true });
  const { setValue: setMood } = useRiveEnum(FINN_RIVE.mood, instance);
  const nod = useRiveTrigger(FINN_RIVE.nod, instance);
  const hop = useRiveTrigger(FINN_RIVE.hop, instance);
  const bob = useRiveTrigger(FINN_RIVE.bob, instance);

  useEffect(() => {
    if (instance) setMood(mood);
  }, [instance, mood, setMood]);

  useImperativeHandle(ref, () => ({ fire: (name) => ({ nod, hop, bob })[name].trigger() }), [nod, hop, bob]);

  if (!file || !instance) return <>{fallback}</>;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={FINN_LABEL[mood]} style={{ width: size, height: size }}>
      <RiveView
        file={file}
        artboardName={FINN_RIVE.head.artboard}
        stateMachineName={FINN_RIVE.head.stateMachine}
        dataBind={instance}
        fit={Fit.Contain}
        autoPlay
        style={{ width: size, height: size }}
      />
    </View>
  );
}

/** Full-body Finn for the peek; waves whenever `waveKey` changes. */
export function FinnRiveBody({ size, fallback, waveKey }: { size: number; fallback: ReactNode; waveKey: number }) {
  const file = useFinnFile();
  const { instance } = useViewModelInstance(file, { viewModelName: FINN_RIVE.body.viewModel, async: true });
  const { setValue: setHidden } = useRiveBoolean(FINN_RIVE.hidden, instance);
  const { trigger: wave } = useRiveTrigger(FINN_RIVE.wave, instance);

  // The container handles the rise; keep the body itself visible.
  useEffect(() => {
    if (instance) setHidden(false);
  }, [instance, setHidden]);

  useEffect(() => {
    if (instance && waveKey > 0) wave();
  }, [instance, waveKey, wave]);

  if (!file || !instance) return <>{fallback}</>;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Finn waves" style={{ width: size, height: size }}>
      <RiveView
        file={file}
        artboardName={FINN_RIVE.body.artboard}
        stateMachineName={FINN_RIVE.body.stateMachine}
        dataBind={instance}
        fit={Fit.Contain}
        autoPlay
        style={{ width: size, height: size }}
      />
    </View>
  );
}
