/**
 * Distance & routing utilities for BatBnB.
 *
 * Uses the Haversine formula for quick straight-line distances and the free
 * OSRM (Open Source Routing Machine) API for walking / driving time estimates.
 * No API key required.
 */

// Batangas State University – Pablo Borbon Main Campus (Main Gate)
export const BATSTATEU_COORDS = {
  latitude: 13.7565,
  longitude: 121.0583,
} as const;

type LatLng = { latitude: number; longitude: number };

// ─── Haversine (straight-line) ──────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Returns the straight-line distance in **kilometres**. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      sinDLon *
      sinDLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Friendly string for a km distance, e.g. "350 m" or "1.2 km". */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// ─── OSRM routing ───────────────────────────────────────────────────────────

type OSRMProfile = "foot" | "car";

type RouteResult = {
  distanceKm: number;
  durationMinutes: number;
};

/**
 * Calls the public OSRM demo server for a single A→B route.
 *
 * **Profile** can be `"foot"` (walking) or `"car"` (driving).
 * Returns `null` when the server is unreachable or the route cannot be found.
 */
export async function getRoute(
  from: LatLng,
  to: LatLng,
  profile: OSRMProfile = "foot",
): Promise<RouteResult | null> {
  const osrmProfile = profile === "foot" ? "foot" : "car";
  const url =
    `https://router.project-osrm.org/route/v1/${osrmProfile}/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=false`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "BatBnB/1.0" },
    });

    if (!response.ok) return null;

    const json = await response.json();

    if (json.code !== "Ok" || !json.routes?.length) return null;

    const route = json.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: Math.ceil(route.duration / 60),
    };
  } catch {
    return null;
  }
}

/** Friendly string for a duration, e.g. "5 min" or "1 hr 12 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hrs} hr`;
  }
  return `${hrs} hr ${mins} min`;
}

/**
 * Calculate the straight-line distance from a listing to BatStateU.
 * This is a fast, synchronous calculation that needs no network.
 */
export function distanceToCampusKm(listing: LatLng): number {
  return haversineDistanceKm(listing, BATSTATEU_COORDS);
}
