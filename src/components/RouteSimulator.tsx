"use client";

/**
 * RouteSimulator — animates a marker along the route.
 *
 * Big picture:
 *   1. Add a blue trail + red marker to the map
 *   2. progress goes from 0 → 1 over a few seconds
 *   3. Each frame: update marker position + blue line behind it
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type maplibregl from "maplibre-gl";
import ukRoute from "@/data/uk-route.json";
import { alongRoute, type LngLat } from "@/lib/routeMath";

const DURATION_MS = 12_000;

function getRouteCoords(): LngLat[] {
  const feature = ukRoute.features.find((f) => f.properties?.kind === "route");
  if (!feature || feature.geometry.type !== "LineString") {
    throw new Error("Missing route LineString in uk-route.json");
  }
  return feature.geometry.coordinates as LngLat[];
}

const ROUTE = getRouteCoords();

/** Push marker + trail GeoJSON onto the map for this progress. */
function draw(map: maplibregl.Map, progress: number) {
  const { position, travelled } = alongRoute(ROUTE, progress);

  const marker = map.getSource("marker") as maplibregl.GeoJSONSource | undefined;
  const trail = map.getSource("travelled") as maplibregl.GeoJSONSource | undefined;

  marker?.setData({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: position },
  });
  trail?.setData({
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: travelled },
  });
}

type Props = { map: maplibregl.Map };

export default function RouteSimulator({ map }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // Latest progress for the animation (so Pause → Play can resume)
  const progressRef = useRef(0);

  // --- 1) Add marker + trail layers once ---
  useEffect(() => {
    const start = ROUTE[0];

    map.addSource("travelled", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [start, start] },
      },
    });
    map.addLayer({
      id: "travelled-line",
      type: "line",
      source: "travelled",
      paint: { "line-color": "#1d4ed8", "line-width": 5 },
    });

    map.addSource("marker", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: start },
      },
    });
    map.addLayer({
      id: "marker-circle",
      type: "circle",
      source: "marker",
      paint: {
        "circle-radius": 11,
        "circle-color": "#dc2626",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#fff",
      },
    });

    return () => {
      map.removeLayer("marker-circle");
      map.removeLayer("travelled-line");
      map.removeSource("marker");
      map.removeSource("travelled");
    };
  }, [map]);

  // --- 2) When playing, animate progress 0 → 1 ---
  useEffect(() => {
    if (!playing) return;

    const startedAt = performance.now() - progressRef.current * DURATION_MS;
    let frame = 0;

    const tick = (now: number) => {
      const next = Math.min(1, (now - startedAt) / DURATION_MS);
      draw(map, next);
      progressRef.current = next;
      setProgress(next);

      if (next < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, map]);

  function play() {
    if (progressRef.current >= 1) {
      draw(map, 0);
      progressRef.current = 0;
      setProgress(0);
    }
    setPlaying(true);
  }

  function reset() {
    setPlaying(false);
    draw(map, 0);
    progressRef.current = 0;
    setProgress(0);
  }

  return (
    <div style={panelStyle}>
      <button
        type="button"
        onClick={playing ? () => setPlaying(false) : play}
        style={btnStyle}
      >
        {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
      </button>
      <button type="button" onClick={reset} style={btnStyle}>
        Reset
      </button>
      <span>Progress: {Math.round(progress * 100)}%</span>
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: "absolute",
  left: 16,
  bottom: 24,
  zIndex: 1,
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
};

const btnStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#f8fafc",
  cursor: "pointer",
  fontWeight: 600,
};
