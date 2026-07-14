/**
 * Tiny helpers for animating along a route.
 *
 * Idea in one sentence:
 *   progress (0 → 1)  →  find a [lng, lat] on the line  →  also build the line "behind" us
 */

export type LngLat = [number, number];

/** Straight-line distance between two points (good enough for this demo). */
function distance(a: LngLat, b: LngLat): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/** Mix two points. t=0 → a, t=1 → b, t=0.5 → halfway. */
function lerp(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Given the full route and a progress value from 0 to 1,
 * return:
 *   - position: where the marker should be right now
 *   - travelled: every coordinate from the start up to that position
 *                (used to draw the coloured "already done" line)
 */
export function getProgressAlongRoute(
  coordinates: LngLat[],
  progress: number,
): { position: LngLat; travelled: LngLat[] } {
  // Clamp so progress stays in [0, 1]
  const p = Math.max(0, Math.min(1, progress));

  // Edge cases: start / end of the trip
  if (p === 0) {
    return { position: coordinates[0], travelled: [coordinates[0]] };
  }
  if (p === 1) {
    return {
      position: coordinates[coordinates.length - 1],
      travelled: [...coordinates],
    };
  }

  // 1) Measure each segment, and the whole route length
  const segments: number[] = [];
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const len = distance(coordinates[i], coordinates[i + 1]);
    segments.push(len);
    total += len;
  }

  // 2) How far along the route should we be?
  let remaining = p * total;

  // 3) Walk segment by segment until remaining fits in the current one
  for (let i = 0; i < segments.length; i++) {
    const segLen = segments[i];

    if (remaining <= segLen) {
      // We are part-way along segment i → i+1
      const t = segLen === 0 ? 0 : remaining / segLen;
      const position = lerp(coordinates[i], coordinates[i + 1], t);

      // "Travelled" = every full waypoint so far + current position
      const travelled = coordinates.slice(0, i + 1);
      travelled.push(position);

      return { position, travelled };
    }

    remaining -= segLen;
  }

  // Fallback (should not happen): last point
  const last = coordinates[coordinates.length - 1];
  return { position: last, travelled: [...coordinates] };
}
