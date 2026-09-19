import { useEffect, useRef, useState } from "react";
import { GeolocateControl, Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationDetail } from "../types";
import { HYDERABAD_CENTER, HYDERABAD_ZOOM, MAP_STYLE_URL, STATION_ZOOM } from "./config";
import { MapControls } from "./MapControls";

export type GpsFix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export function OutdoorMap({
  selectedStation,
  onGps,
  onGpsError,
  onEnterIndoor,
}: {
  selectedStation: StationDetail | null;
  onGps: (fix: GpsFix) => void;
  onGpsError: (message: string, code?: number) => void;
  onEnterIndoor?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geoRef = useRef<GeolocateControl | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onGpsRef = useRef(onGps);
  const onGpsErrorRef = useRef(onGpsError);
  const [unavailable, setUnavailable] = useState(false);
  const [ready, setReady] = useState(false);

  onGpsRef.current = onGps;
  onGpsErrorRef.current = onGpsError;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [HYDERABAD_CENTER.longitude, HYDERABAD_CENTER.latitude],
      zoom: HYDERABAD_ZOOM,
    });
    mapRef.current = map;

    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 12_000 },
      trackUserLocation: true,
      showAccuracyCircle: true,
      showUserLocation: true,
      fitBoundsOptions: { maxZoom: 16 },
    });
    geoRef.current = geolocate;
    map.addControl(geolocate);

    geolocate.on("geolocate", (event: { coords: GeolocationCoordinates }) => {
      onGpsRef.current({
        latitude: event.coords.latitude,
        longitude: event.coords.longitude,
        accuracy: event.coords.accuracy ?? null,
      });
    });
    geolocate.on("error", (error) => {
      onGpsErrorRef.current(gpsMessage(error), error.code);
    });

    map.on("load", () => setReady(true));
    map.on("error", () => setUnavailable(true));

    const resize = () => map.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      markerRef.current?.remove();
      markerRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      geoRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markerRef.current?.remove();
    markerRef.current = null;
    popupRef.current?.remove();
    popupRef.current = null;

    if (!selectedStation) {
      map.easeTo({
        center: [HYDERABAD_CENTER.longitude, HYDERABAD_CENTER.latitude],
        zoom: HYDERABAD_ZOOM,
        duration: 700,
      });
      return;
    }

    const lat = selectedStation.latitude;
    const lng = selectedStation.longitude;
    const html = stationPopupHtml(selectedStation);

    if (lat != null && lng != null) {
      const popup = new Popup({ offset: 18, closeButton: true }).setHTML(html);
      popupRef.current = popup;
      const el = document.createElement("button");
      el.type = "button";
      el.className = selectedStation.is_interchange ? "mw-station-marker mw-station-marker-interchange" : "mw-station-marker";
      el.setAttribute("aria-label", selectedStation.station_name);
      const marker = new Marker({ element: el }).setLngLat([lng, lat]).setPopup(popup).addTo(map);
      markerRef.current = marker;
      map.flyTo({ center: [lng, lat], zoom: STATION_ZOOM, duration: 900 });
      popup.addTo(map);
      popup.setLngLat([lng, lat]);
    }
  }, [selectedStation, ready]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !onEnterIndoor) return;
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-enter-indoor]")) onEnterIndoor?.();
    }
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [onEnterIndoor]);

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-3xl border border-line bg-paper">
      <div ref={containerRef} className="mw-map h-full min-h-[360px] w-full" />
      <MapControls
        onZoomIn={() => mapRef.current?.zoomIn({ duration: 250 })}
        onZoomOut={() => mapRef.current?.zoomOut({ duration: 250 })}
        onLocate={() => {
          if (!navigator.geolocation) {
            onGpsError("Location is not supported in this browser.");
            return;
          }
          geoRef.current?.trigger();
        }}
        onFit={() => {
          const station = selectedStation;
          const map = mapRef.current;
          if (!map) return;
          if (station?.latitude != null && station.longitude != null) {
            map.flyTo({ center: [station.longitude, station.latitude], zoom: STATION_ZOOM, duration: 700 });
            return;
          }
          map.easeTo({
            center: [HYDERABAD_CENTER.longitude, HYDERABAD_CENTER.latitude],
            zoom: HYDERABAD_ZOOM,
            duration: 500,
          });
        }}
      />
      {unavailable ? (
        <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-line bg-card p-3 text-sm" role="status">
          Map unavailable. Navigation instructions stay available.
        </div>
      ) : null}
    </div>
  );
}

function stationPopupHtml(station: StationDetail) {
  const lines = station.lines.join(", ");
  const interchange = station.is_interchange ? `<p class="mw-popup-meta">Interchange</p>` : "";
  const coords =
    station.latitude != null && station.longitude != null
      ? ""
      : `<p class="mw-popup-meta">Geographic coordinates are not available for this station yet.</p>`;
  return `<div class="mw-popup">
    <p class="mw-popup-title">${escapeHtml(station.station_name)}</p>
    <p class="mw-popup-meta">${escapeHtml(lines || "Hyderabad Metro")}</p>
    ${interchange}
    ${coords}
    <button type="button" data-enter-indoor class="mw-popup-action">Navigate</button>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function gpsMessage(error: { code: number }) {
  if (error.code === 1) return "Location unavailable";
  if (error.code === 2) return "Unable to access your location.";
  if (error.code === 3) return "Unable to access your location.";
  return "Unable to access your location.";
}
