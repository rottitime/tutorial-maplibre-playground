/**
 * progress 0 → start, progress 1 → end
 *
 * We treat the route as equal steps between waypoints
 * (easy to understand; good enough for this demo).
 *
 * Example with 3 points A-B-C:
 *   0    = A
 *   0.5  = B
 *   1    = C
 *   0.25 = halfway A→B
 */

export type LngLat = [number, number];

export function alongRoute(coords: LngLat[], progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const last = coords.length - 1;

  // Which segment? e.g. 8 points → 7 segments
  const exact = t * last;
  const i = Math.min(Math.floor(exact), last - 1);
  const frac = exact - i; // 0..1 within that segment

  const a = coords[i];
  const b = coords[i + 1];
  const position: LngLat = [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
  ];

  // Line from start up to where we are now
  const travelled = [...coords.slice(0, i + 1), position];

  return { position, travelled };
}
