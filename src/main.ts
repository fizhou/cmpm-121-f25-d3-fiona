// imports
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";

// map and grid configuration
const ORIGIN = leaflet.latLng(36.9983, -122.0602);
const WORLD_ORIGIN_LAT = 0;
const WORLD_ORIGIN_LNG = 0;
const ZOOM_LEVEL = 19;
const TILE_SIZE_DEGREES = 0.0001;
const INTERACT_RANGE = 3;
const WIN_TARGET = 128;

// grid cell identifiers
interface GridCellID {
  i: number;
  j: number;
}

type TileID = `${number},${number}`;
const idOf = (cell: GridCellID): TileID => `${cell.i},${cell.j}`;

// helper functions
function latLngToCell(lat: number, lng: number): GridCellID {
  const i = Math.floor((lat - WORLD_ORIGIN_LAT) / TILE_SIZE_DEGREES);
  const j = Math.floor((lng - WORLD_ORIGIN_LNG) / TILE_SIZE_DEGREES);
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

function cellCenterLatLng(cell: GridCellID): leaflet.LatLng {
  return cellToBounds(cell).getCenter();
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
const playerMarker = leaflet
  .marker(ORIGIN)
  .addTo(map)
  .bindTooltip("teehee this is you :3");

// player grid position
let playerCell: GridCellID = latLngToCell(ORIGIN.lat, ORIGIN.lng);

// grid data
function cellBounds(cell: GridCellID): leaflet.LatLngBounds {
  return cellToBounds(cell);
}

const nearPlayer = (cell: GridCellID): boolean =>
  Math.max(Math.abs(cell.i - playerCell.i), Math.abs(cell.j - playerCell.j)) <=
    INTERACT_RANGE;

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

function updateRectStyle() {
  for (const [key, view] of views) {
    const [iStr, jStr] = key.split(",");
    const cell: GridCellID = { i: Number(iStr), j: Number(jStr) };

    const isNear = nearPlayer(cell);
    view.rect.setStyle({
      color: isNear ? "blue" : "gray",
      weight: isNear ? 2 : 1,
    });
  }
}

function clearGrid() {
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  const minCell = latLngToCell(southWest.lat, southWest.lng);
  const maxCell = latLngToCell(northEast.lat, northEast.lng);

  const visibleCells = new Set<TileID>();

  for (let i = minCell.i; i <= maxCell.i; i++) {
    for (let j = minCell.j; j <= maxCell.j; j++) {
      const cell: GridCellID = { i, j };
      const key = idOf(cell);
      visibleCells.add(key);
      drawGrid(cell);
    }
  }

  for (const [key, view] of views) {
    if (!visibleCells.has(key)) {
      map.removeLayer(view.rect);
      map.removeLayer(view.tokenMarker);
      views.delete(key);

      modified.delete(key);
    }
  }
}

function movePlayer(di: number, dj: number) {
  playerCell = {
    i: playerCell.i + di,
    j: playerCell.j + dj,
  };

  const center = cellCenterLatLng(playerCell);
  playerMarker.setLatLng(center);
  map.setView(center, ZOOM_LEVEL);

  updateRectStyle();
  renderHUD(`moved to cell (${playerCell.i}, ${playerCell.j})`);
}

// player movement controls
const controlElements = document.createElement("div");
controlElements.id = "controls";
controlElements.innerHTML = `
  <button id="move-north"> North </button>
  <button id="move-south"> South </button>
  <button id="move-west"> West </button>
  <button id="move-east"> East </button>
`;
document.body.append(controlElements);

(document.getElementById("move-north") as HTMLButtonElement).onclick = () => {
  movePlayer(1, 0);
};
(document.getElementById("move-south") as HTMLButtonElement).onclick = () => {
  movePlayer(-1, 0);
};
(document.getElementById("move-west") as HTMLButtonElement).onclick = () => {
  movePlayer(0, -1);
};
(document.getElementById("move-east") as HTMLButtonElement).onclick = () => {
  movePlayer(0, 1);
};

// initial grid rendering
clearGrid();

// update grid on map move
map.on("moveend", () => {
  clearGrid();
});
