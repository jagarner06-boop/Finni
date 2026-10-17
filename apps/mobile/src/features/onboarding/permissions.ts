import type { NotifKey } from "./content";
export async function requestChosenNotifications(
  preferences: Record<NotifKey, boolean>,
  request: () => Promise<unknown>,
) {
  if (Object.values(preferences).some(Boolean)) {
    try {
      await request();
    } catch {
      /* Permission failures must not block setup. */
    }
  }
}
