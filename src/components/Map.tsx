"use client";

/**
 * Map.tsx — only the map + static route.
 * The moving marker / coloured trail live in RouteSimulator.tsx.
 */

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ukRoute from "@/data/uk-route.json";
import RouteSimulator from "@/components/RouteSimulator";

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Once the map has loaded, we hand it to RouteSimulator
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-1.8, 53.5],
      zoom: 5.4,
    });

    instance.addControl(new maplibregl.NavigationControl(), "top-right");

    instance.on("load", () => {
      // Static GeoJSON: full route + waypoints
      instance.addSource("uk-route", {
        type: "geojson",
        data: ukRoute as FeatureCollection,
      });

      // Grey line = the full path (does not animate)
      instance.addLayer({
        id: "route-line-full",
        type: "line",
        source: "uk-route",
        filter: ["==", ["get", "kind"], "route"],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#94a3b8",
          "line-width": 4,
          "line-opacity": 0.7,
        },
      });

      // Orange circles at each city
      instance.addLayer({
        id: "route-waypoints",
        type: "circle",
        source: "uk-route",
        filter: ["==", ["get", "kind"], "waypoint"],
        paint: {
          "circle-radius": 8,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      instance.addLayer({
        id: "route-waypoint-labels",
        type: "symbol",
        source: "uk-route",
        filter: ["==", ["get", "kind"], "waypoint"],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular"],
          "text-size": 12,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Map is ready — RouteSimulator can attach to it
      setMap(instance);
    });

    mapRef.current = instance;

    return () => {
      setMap(null);
      instance.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Simulator only mounts after the map is loaded */}
      {map && <RouteSimulator map={map} />}
    </div>
  );
}
