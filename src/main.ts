// imports
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";

// map and grid configuration
const ORIGIN = leaflet.latLng(36.9985, -122.0600);
const ZOOM_LEVEL = 19;
const TILE_SIZE_DEGREES = 0.0001;
const RANGE = 8;
const INTERACT_RANGE = 3;
const WIN_TARGET = 8;

// id helpers
type TileID = `${number},${number}`;
const idOf = (lat: number, lng: number): TileID => `${lat},${lng}`;

// dom elements
const mapElement = document.createElement("div");
mapElement.id = "map";
document.body.append(mapElement);

const hudElement = document.createElement("div");
hudElement.id = "hud";
document.body.append(hudElement);

// map setup
const map = leaflet.map(mapElement, {
  center: ORIGIN,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// player marker
leaflet.marker(ORIGIN).addTo(map).bindTooltip("teehee this is you :3");

// grid data
function cellBounds(lat: number, lng: number): leaflet.LatLngBounds {
  const southWest = leaflet.latLng(
    ORIGIN.lat + lat * TILE_SIZE_DEGREES,
    ORIGIN.lng + lng * TILE_SIZE_DEGREES,
  );
  const northEast = leaflet.latLng(
    ORIGIN.lat + (lat + 1) * TILE_SIZE_DEGREES,
    ORIGIN.lng + (lng + 1) * TILE_SIZE_DEGREES,
  );
  return leaflet.latLngBounds([southWest, northEast]);
}

const nearPlayer = (lat: number, lng: number): boolean =>
  Math.max(Math.abs(lat), Math.abs(lng)) <= INTERACT_RANGE;

// initial token spawning
function initialTokenSpawn(lat: number, lng: number): number | null {
  const r = luck(idOf(lat, lng));
  if (r < 0.18) return 1;
  return null;
}

const modified = new Map<TileID, number | null>();
function currentTokenSpawn(lat: number, lng: number): number | null {
  const key = idOf(lat, lng);
  return modified.has(key) ? modified.get(key)! : initialTokenSpawn(lat, lng);
}

function setTokenSpawn(lat: number, lng: number, value: number | null) {
  modified.set(idOf(lat, lng), value);
}

// inventory and hud
let hand: number | null = null;
function renderHUD(msg = "") {
  hudElement.innerHTML = `
    <div>in hand: ${hand === null ? "nothing" : `token(${hand})`}</div>
    <div>${msg}</div>
  `;
  if (hand && hand >= WIN_TARGET) {
    hudElement.innerHTML +=
      `<div class="win-message">yayyyy you win! refresh to play again.</div>`;
  }
}
renderHUD();

// grid rendering and interaction
type gridView = { rect: leaflet.Rectangle; tokenMarker: leaflet.Marker };
const views = new Map<TileID, gridView>();

function drawGrid(lat: number, lng: number) {
  const key = idOf(lat, lng);
  if (views.has(key)) return;

  const bounds = cellBounds(lat, lng);
  const rect = leaflet.rectangle(bounds, {
    color: nearPlayer(lat, lng) ? "blue" : "gray",
    weight: nearPlayer(lat, lng) ? 2 : 1,
    fillOpacity: 0.1,
  }).addTo(map);

  const center = bounds.getCenter();
  const label = leaflet.marker(center, {
    interactive: false,
    icon: leaflet.divIcon({
      className: "token-label",
      html: `${currentTokenSpawn(lat, lng) ?? ""}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  }).addTo(map);

  rect.on("click", () => {
    if (!nearPlayer(lat, lng)) {
      renderHUD("too far away to interact with that tile.");
      return;
    }

    const here = currentTokenSpawn(lat, lng);
    if (hand === null && here !== null) {
      hand = here;
      setTokenSpawn(lat, lng, null);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: "",
      }));
      renderHUD("picked up token.");
      return;
    }

    if (hand !== null && here === hand) {
      const newValue = hand * 2;
      setTokenSpawn(lat, lng, newValue);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: `${newValue}`,
      }));
      hand = null;
      renderHUD("merged token!");
      return;
    }

    if (hand !== null && here === null) {
      setTokenSpawn(lat, lng, hand);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: `${hand}`,
      }));
      hand = null;
      renderHUD("placed token!");
      return;
    }

    renderHUD("cannot interact with that tile.");
  });

  views.set(key, { rect, tokenMarker: label });
}

for (let lat = -RANGE; lat <= RANGE; lat++) {
  for (let lng = -RANGE; lng <= RANGE; lng++) {
    drawGrid(lat, lng);
  }
}
