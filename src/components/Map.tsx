"use client";

import { useEffect, useRef } from "react";
import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ukRoute from "@/data/uk-route.json";

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-1.8, 53.5],
      zoom: 5.4,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("uk-route", {
        type: "geojson",
        data: ukRoute as FeatureCollection,
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "uk-route",
        filter: ["==", ["get", "kind"], "route"],
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#1d4ed8",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
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

      map.addLayer({
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
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "100vh" }}
    />
  );
}
