"use client";

/**
 * RouteSimulator.tsx — everything about the trip animation.
 *
 * Receives a ready MapLibre map, then:
 *   1. Adds a blue "travelled" line + a red marker
 *   2. Animates progress from 0 → 1
 *   3. Each frame: move marker + grow the blue line behind it
 *   4. Shows Play / Pause / Reset controls
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Feature, LineString, Point } from "geojson";
import type maplibregl from "maplibre-gl";
import ukRoute from "@/data/uk-route.json";
import { getProgressAlongRoute, type LngLat } from "@/lib/routeMath";

// How long one full trip takes (milliseconds)
const TRIP_DURATION_MS = 12_000;

type Props = {
  map: maplibregl.Map;
};

/** Pull the LineString coordinates out of our GeoJSON. */
function getRouteCoordinates(): LngLat[] {
  const route = ukRoute.features.find(
    (f) => f.properties?.kind === "route" && f.geometry.type === "LineString",
  );
  if (!route || route.geometry.type !== "LineString") {
    throw new Error("Route LineString not found in uk-route.json");
  }
  return route.geometry.coordinates as LngLat[];
}

/** Build a GeoJSON Point for the moving marker. */
function pointFeature(position: LngLat): Feature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: position },
  };
}

/** Build a GeoJSON LineString for the coloured trail behind the marker. */
function lineFeature(coordinates: LngLat[]): Feature<LineString> {
  return {
    type: "Feature",
    properties: { kind: "travelled" },
    geometry: {
      type: "LineString",
      // A LineString needs at least 2 points
      coordinates:
        coordinates.length >= 2
          ? coordinates
          : [coordinates[0], coordinates[0]],
    },
  };
}

export default function RouteSimulator({ map }: Props) {
  const markerSourceRef = useRef<maplibregl.GeoJSONSource | null>(null);
  const travelledSourceRef = useRef<maplibregl.GeoJSONSource | null>(null);

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 = London, 1 = Edinburgh
  const [ready, setReady] = useState(false);

  // ----------------------------------------------------------
  // 1) Add simulator layers onto the map (once)
  // ----------------------------------------------------------
  useEffect(() => {
    const coordinates = getRouteCoordinates();
    const start = coordinates[0];

    // Blue line that grows as we travel
    map.addSource("travelled", {
      type: "geojson",
      data: lineFeature([start]),
    });

    map.addLayer({
      id: "route-line-travelled",
      type: "line",
      source: "travelled",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#1d4ed8",
        "line-width": 5,
        "line-opacity": 1,
      },
    });

    // Red moving marker
    map.addSource("marker", {
      type: "geojson",
      data: pointFeature(start),
    });

    map.addLayer({
      id: "moving-marker",
      type: "circle",
      source: "marker",
      paint: {
        "circle-radius": 11,
        "circle-color": "#dc2626",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });

    markerSourceRef.current = map.getSource("marker") as maplibregl.GeoJSONSource;
    travelledSourceRef.current = map.getSource(
      "travelled",
    ) as maplibregl.GeoJSONSource;
    setReady(true);

    // Clean up layers if this component unmounts
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      if (map.getLayer("moving-marker")) map.removeLayer("moving-marker");
      if (map.getLayer("route-line-travelled")) {
        map.removeLayer("route-line-travelled");
      }
      if (map.getSource("marker")) map.removeSource("marker");
      if (map.getSource("travelled")) map.removeSource("travelled");

      markerSourceRef.current = null;
      travelledSourceRef.current = null;
    };
  }, [map]);

  // ----------------------------------------------------------
  // 2) Paint marker + trail for a given progress (0..1)
  // ----------------------------------------------------------
  function paintAtProgress(p: number) {
    const coordinates = getRouteCoordinates();
    const { position, travelled } = getProgressAlongRoute(coordinates, p);

    markerSourceRef.current?.setData(pointFeature(position));
    travelledSourceRef.current?.setData(lineFeature(travelled));
    setProgress(p);
  }

  // ----------------------------------------------------------
  // 3) Animation loop: each frame bump progress, then paint
  // ----------------------------------------------------------
  function tick(now: number) {
    if (startTimeRef.current === null) {
      startTimeRef.current = now;
    }

    const elapsed = now - startTimeRef.current;
    const next = Math.min(1, elapsed / TRIP_DURATION_MS);

    paintAtProgress(next);

    if (next < 1) {
      animationRef.current = requestAnimationFrame(tick);
    } else {
      setPlaying(false);
      animationRef.current = null;
      startTimeRef.current = null;
    }
  }

  function play() {
    if (playing || !ready) return;

    if (progress >= 1) {
      paintAtProgress(0);
    }

    setPlaying(true);
    // Resume from current progress (so Pause → Play continues)
    startTimeRef.current = performance.now() - progress * TRIP_DURATION_MS;
    animationRef.current = requestAnimationFrame(tick);
  }

  function pause() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    startTimeRef.current = null;
    setPlaying(false);
  }

  function reset() {
    pause();
    paintAtProgress(0);
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        bottom: 24,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "rgba(255, 255, 255, 0.92)",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <button type="button" onClick={playing ? pause : play} style={buttonStyle}>
        {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
      </button>
      <button type="button" onClick={reset} style={buttonStyle}>
        Reset
      </button>
      <span style={{ color: "#334155", minWidth: 90 }}>
        Progress: {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#f8fafc",
  cursor: "pointer",
  fontWeight: 600,
};
