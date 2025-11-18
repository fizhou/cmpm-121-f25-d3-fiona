// imports
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

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
type TokenMemento = number | null;

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

function movePlayerToCell(cell: GridCellID, msgPrefix = "moved to cell") {
  playerCell = cell;
  const center = cellCenterLatLng(cell);
  playerMarker.setLatLng(center);
  map.setView(center, ZOOM_LEVEL);

  updateRectStyle();
  renderHUD(`${msgPrefix} (${cell.i}, ${cell.j})`);
}

// dom elements
const mapElement = document.createElement("div");
mapElement.id = "map";
document.body.append(mapElement);

const hudElement = document.createElement("div");
hudElement.id = "hud";
document.body.append(hudElement);

// geolocation setup
let geoWatchID: number | null = null;

function startGeolocation() {
  if (!navigator.geolocation) {
    renderHUD("geolocation is not supported by your browser.");
    return;
  }

  geoWatchID = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const cell = latLngToCell(lat, lng);
      movePlayerToCell(cell, "geolocated to cell");
    },
    (error) => {
      renderHUD(`geolocation error: ${error.message}`);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    },
  );
}

function stopGeolocation() {
  if (geoWatchID !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(geoWatchID);
    geoWatchID = null;
  }
}

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
function flyweightInitialToken(cell: GridCellID): TokenMemento {
  // flyweight intrinsic state: compute token value from cell id. recomputed whenever needed.
  const r = luck(idOf(cell));
  if (r < 0.18) return 1;
  return null;
}

// flyweight extrinsic state: map stores extrinsic token values that differ from intrinsic state. acts as caretaker.
const flyweightExtrinsicState = new Map<TileID, TokenMemento>();

function getTokenFromFlyweight(cell: GridCellID): TokenMemento {
  // flyweight factory: returns either intrinsic or extrinsic token value.
  const key = idOf(cell);
  return flyweightExtrinsicState.has(key)
    ? flyweightExtrinsicState.get(key)!
    : flyweightInitialToken(cell);
}

function setTokenMemento(cell: GridCellID, value: TokenMemento) {
  // memento setter: updates extrinsic token value.
  flyweightExtrinsicState.set(idOf(cell), value);
}

// inventory and hud
let hand: TokenMemento = null;
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
// flyweight views: map of cell views to avoid recreating on each render.
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
      html: `${getTokenFromFlyweight(cell) ?? ""}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  }).addTo(map);

  rect.on("click", () => {
    if (!nearPlayer(cell)) {
      renderHUD("too far away to interact with that tile.");
      return;
    }

    const here = getTokenFromFlyweight(cell);
    if (hand === null && here !== null) {
      hand = here;
      // memento capture: pick up token, storing its value in hand and clears by setting cell to null.
      setTokenMemento(cell, null);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: "",
      }));
      renderHUD("picked up token.");
      return;
    }

    if (hand !== null && here === hand) {
      const newValue = hand * 2;
      // memento capture: merge tokens, updating cell value and storing new value as latest memento.
      setTokenMemento(cell, newValue);
      label.setIcon(leaflet.divIcon({
        className: "token-label",
        html: `${newValue}`,
      }));
      hand = null;
      renderHUD("merged token!");
      return;
    }

    if (hand !== null && here === null) {
      // memento capture: place token, updates saved state.
      setTokenMemento(cell, hand);
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
    }
  }
}

function movePlayer(di: number, dj: number) {
  movePlayerToCell({ i: playerCell.i + di, j: playerCell.j + dj });
}

// geolocation controls
type MovementMode = "geolocation" | "manual";
let movementMode: MovementMode = "manual";

const movementModeElements = document.createElement("div");
movementModeElements.id = "movement-mode-controls";
movementModeElements.innerHTML = `
  <button id="manual-mode">Manual Mode</button>
  <button id="geolocation-mode">Geolocation Mode</button>
`;
document.body.append(movementModeElements);

function activateManualMode() {
  movementMode = "manual";
  stopGeolocation();
  controlElements.style.display = "block";
  renderHUD("manual movement mode enabled.");
}

function activateGeolocationMode() {
  movementMode = "geolocation";
  startGeolocation();
  controlElements.style.display = "none";
  renderHUD("geolocation movement mode enabled.");
}

(document.getElementById("manual-mode") as HTMLButtonElement).onclick = () => {
  activateManualMode();
};

(document.getElementById("geolocation-mode") as HTMLButtonElement).onclick =
  () => {
    activateGeolocationMode();
  };

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

// default to manual mode
activateManualMode();

// initial grid rendering
clearGrid();

// update grid on map move
map.on("moveend", () => {
  clearGrid();
});
