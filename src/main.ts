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
const idOf = (i: number, j: number): TileID => `${i},${j}`;

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
function cellBounds(i: number, j: number): leaflet.LatLngBounds {
  const southWest = leaflet.latLng(
    ORIGIN.lat + i * TILE_SIZE_DEGREES,
    ORIGIN.lng + j * TILE_SIZE_DEGREES,
  );
  const northEast = leaflet.latLng(
    ORIGIN.lat + (i + 1) * TILE_SIZE_DEGREES,
    ORIGIN.lng + (j + 1) * TILE_SIZE_DEGREES,
  );
  return leaflet.latLngBounds([southWest, northEast]);
}

const nearPlayer = (i: number, j: number): boolean =>
  Math.max(Math.abs(i), Math.abs(j)) <= INTERACT_RANGE;

// initial token spawning
function initialTokenSpawn(i: number, j: number): number | null {
  const r = luck(idOf(i, j));
  if (r < 0.18) return 1;
  return null;
}

const modified = new Map<TileID, number | null>();
function currentTokenSpawn(i: number, j: number): number | null {
  const key = idOf(i, j);
  return modified.has(key) ? modified.get(key)! : initialTokenSpawn(i, j);
}

function setTokenSpawn(i: number, j: number, value: number | null) {
  modified.set(idOf(i, j), value);
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

function drawGrid(i: number, j: number) {
  const key = idOf(i, j);
  if (views.has(key)) return;

  const bounds = cellBounds(i, j);
  const rect = leaflet.rectangle(bounds, {
    color: nearPlayer(i, j) ? "blue" : "gray",
    weight: nearPlayer(i, j) ? 2 : 1,
    fillOpacity: 0.1,
  }).addTo(map);

  const center = bounds.getCenter();
  const label = leaflet.marker(center, {
    interactive: false,
    icon: leaflet.divIcon({
      className: "token-label",
      html: `${currentTokenSpawn(i, j) ?? ""}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  }).addTo(map);

  rect.on("click", () => {
    if (!nearPlayer(i, j)) {
      renderHUD("too far away to interact with that tile.");
      return;
    }

    const here = currentTokenSpawn(i, j);
    if (hand === null && here !== null) {
      hand = here;
      setTokenSpawn(i, j, null);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: "",
      }));
      renderHUD("picked up token.");
      return;
    }

    if (hand !== null && here === hand) {
      const newValue = hand * 2;
      setTokenSpawn(i, j, newValue);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: `${newValue}`,
      }));
      hand = null;
      renderHUD("merged token!");
      return;
    }

    if (hand !== null && here === null) {
      setTokenSpawn(i, j, hand);
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

for (let i = -RANGE; i <= RANGE; i++) {
  for (let j = -RANGE; j <= RANGE; j++) {
    drawGrid(i, j);
  }
}
