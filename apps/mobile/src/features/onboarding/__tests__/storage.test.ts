import { toFinnProfile } from "../logic";
import {
  loadOnboarding,
  saveOnboarding,
  initialProfile,
  destination,
  setPlanPending,
} from "../state";

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

it("onboards first, then signs in, then builds the plan once", () => {
  expect(destination("loading", true, false)).toBe(null);
  expect(destination("signedOut", false, false)).toBe(null);
  expect(destination("signedOut", true, false)).toBe("onboarding");
  expect(destination("signedIn", true, false)).toBe("onboarding");
  expect(destination("signedOut", true, true, true)).toBe("sign-in");
  expect(destination("signedOut", true, true)).toBe("sign-in");
  expect(destination("signedIn", true, true, true)).toBe("plan");
  expect(destination("signedIn", true, true)).toBe("tabs");
});

it("keeps the plan pending until it is cleared", async () => {
  const store = memory();
  expect((await loadOnboarding(store)).planPending).toBe(false);
  await setPlanPending(store, true);
  await saveOnboarding(store, initialProfile());
  expect(await loadOnboarding(store)).toMatchObject({ complete: true, planPending: true });
  await setPlanPending(store, false);
  expect((await loadOnboarding(store)).planPending).toBe(false);
});

it("persists the profile before marking onboarding complete", async () => {
  const store = memory();
  await saveOnboarding(store, { ...initialProfile(), firstName: "  Alex  " });
  const restored = await loadOnboarding(store);
  expect(restored.complete).toBe(true);
  expect(restored.profile.firstName).toBe("Alex");
  expect(store.data.get("finni.onboarding.complete")).toBe("true");
});

it("does not mark complete when saving the profile fails", async () => {
  const store = memory();
  store.setItem = async () => {
    throw new Error("disk full");
  };
  await expect(saveOnboarding(store, initialProfile())).rejects.toThrow(
    "disk full",
  );
  expect(store.data.has("finni.onboarding.complete")).toBe(false);
});

it("restarts safely after corrupted or missing saved profile", async () => {
  const store = memory();
  store.data.set("finni.onboarding.complete", "true");
  store.data.set("finni.onboarding.v1", "{broken");
  expect((await loadOnboarding(store)).complete).toBe(false);
  store.data.set("finni.onboarding.v1", "{}");
  expect((await loadOnboarding(store)).complete).toBe(false);
});

it("keeps the selected payday after a later app launch", async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 17));
  try {
    const store = memory();
    await saveOnboarding(store, { ...initialProfile(), nextPayday: 0 });
    const { profile } = await loadOnboarding(store);
    expect(toFinnProfile(profile, new Date(2026, 9, 24)).nextPayday).toBe("2026-10-23");
  } finally { jest.useRealTimers(); }
});
it("retains the reference date from the payday selection", async () => {
  const store = memory();
  await saveOnboarding(store, { ...initialProfile(), paydayReferenceDate: "2026-10-17" });
  const { profile } = await loadOnboarding(store);
  expect(toFinnProfile(profile, new Date(2026, 10, 1)).nextPayday).toBe("2026-10-23");
});
