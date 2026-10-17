import type { Atm, LatLng } from "@finni/shared";
import { env } from "../env.js";
import { nessie } from "../nessie/client.js";

const FAR_MILES = 25;

function haversineMiles(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export interface NearbyAtms {
  atms: Atm[];
  usedFallback: boolean;
  note?: string;
}

/**
 * Closest Nessie ATMs. Nessie ignores its own geo filter and only has DC-area ATMs, so we sort by
 * distance ourselves. No device location (denied, or web) → the demo location.
 */
export async function findNearbyAtms(location: LatLng | undefined, count = 3): Promise<NearbyAtms> {
  const origin = location ?? { lat: env.DEMO_LAT, lng: env.DEMO_LNG };
  const atms = (await nessie.getAllAtms())
    .map((a): Atm => {
      const addr = a.address;
      return {
        id: a._id,
        name: a.name,
        address: addr ? `${addr.street_number} ${addr.street_name}, ${addr.city}, ${addr.state}` : "",
        lat: a.geocode.lat,
        lng: a.geocode.lng,
        distanceMiles: Math.round(haversineMiles(origin, a.geocode) * 10) / 10,
        hours: a.hours,
        accessibility: a.accessibility,
      };
    })
    .sort((a, b) => a.distanceMiles! - b.distanceMiles!)
    .slice(0, count);

  let note: string | undefined;
  if (!location) note = "Showing ATMs near the demo location (Arlington, VA).";
  else if (atms[0] && atms[0].distanceMiles! > FAR_MILES)
    note = `The closest Capital One ATMs in Nessie are near Arlington, VA, about ${Math.round(atms[0].distanceMiles!)} mi away.`;
  return { atms, usedFallback: !location, note };
}
