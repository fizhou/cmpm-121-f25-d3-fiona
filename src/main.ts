// imports
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";

// map and grid configuration
const ORIGIN = leaflet.latLng(36.9985, -122.0600);
const WORLD_ORIGIN_LAT = 0;
const WORLD_ORIGIN_LNG = 0;
const ZOOM_LEVEL = 19;
const TILE_SIZE_DEGREES = 0.0001;
const RANGE = 8;
const INTERACT_RANGE = 3;
const WIN_TARGET = 8;

// grid cell identifiers
interface GridCellID {
  i: number;
  j: number;
}

type TileID = `${number},${number}`;
const idOf = (cell: GridCellID): TileID => `${cell.i},${cell.j}`;

function latLngToCell(lat: number, lng: number): GridCellID {
  const i = Math.floor((lat - ORIGIN.lat) / TILE_SIZE_DEGREES);
  const j = Math.floor((lng - ORIGIN.lng) / TILE_SIZE_DEGREES);
  return { i, j };
}

function cellToBounds(cell: GridCellID): leaflet.LatLngBounds {
  const south = WORLD_ORIGIN_LAT + cell.i * TILE_SIZE_DEGREES;
  const west = WORLD_ORIGIN_LNG + cell.j * TILE_SIZE_DEGREES;
  const north = WORLD_ORIGIN_LAT + (cell.i + 1) * TILE_SIZE_DEGREES;
  const east = WORLD_ORIGIN_LNG + (cell.j + 1) * TILE_SIZE_DEGREES;
  return leaflet.latLngBounds(
    leaflet.latLng(south, west),
    leaflet.latLng(north, east),
  );
}

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

// player grid position
const playerCell: GridCellID = latLngToCell(ORIGIN.lat, ORIGIN.lng);

// grid data
function cellBounds(cell: GridCellID): leaflet.LatLngBounds {
  return cellToBounds(cell);
}

const nearPlayer = (cell: GridCellID): boolean =>
  Math.max(Math.abs(cell.i), Math.abs(cell.j)) <= INTERACT_RANGE;

// initial token spawning
function initialTokenSpawn(cell: GridCellID): number | null {
  const r = luck(idOf(cell));
  if (r < 0.18) return 1;
  return null;
}

const modified = new Map<TileID, number | null>();
function currentTokenSpawn(cell: GridCellID): number | null {
  const key = idOf(cell);
  return modified.has(key) ? modified.get(key)! : initialTokenSpawn(cell);
}

function setTokenSpawn(cell: GridCellID, value: number | null) {
  modified.set(idOf(cell), value);
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

function drawGrid(cell: GridCellID) {
  const key = idOf(cell);
  if (views.has(key)) return;

  const bounds = cellBounds(cell);
  const rect = leaflet.rectangle(bounds, {
    color: nearPlayer(cell) ? "blue" : "gray",
    weight: nearPlayer(cell) ? 2 : 1,
    fillOpacity: 0.1,
  }).addTo(map);

  const center = bounds.getCenter();
  const label = leaflet.marker(center, {
    interactive: false,
    icon: leaflet.divIcon({
      className: "token-label",
      html: `${currentTokenSpawn(cell) ?? ""}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  }).addTo(map);

  rect.on("click", () => {
    if (!nearPlayer(cell)) {
      renderHUD("too far away to interact with that tile.");
      return;
    }

    const here = currentTokenSpawn(cell);
    if (hand === null && here !== null) {
      hand = here;
      setTokenSpawn(cell, null);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: "",
      }));
      renderHUD("picked up token.");
      return;
    }

    if (hand !== null && here === hand) {
      const newValue = hand * 2;
      setTokenSpawn(cell, newValue);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: `${newValue}`,
      }));
      hand = null;
      renderHUD("merged token!");
      return;
    }

    if (hand !== null && here === null) {
      setTokenSpawn(cell, hand);
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

  views.set(idOf(cell), { rect, tokenMarker: label });
}

for (let di = -RANGE; di <= RANGE; di++) {
  for (let dj = -RANGE; dj <= RANGE; dj++) {
    drawGrid({ i: playerCell.i + di, j: playerCell.j + dj });
  }
}
