// imports
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import _luck from "./_luck.ts";

// map and grid configuration
const ORIGIN = leaflet.latLng(36.9985, -122.0600);
const ZOOM_LEVEL = 19;
const _TILE_SIZE_DEGREES = 0.0001;
const _RANGE = 8;
const _INTERACT_RANGE = 3;
const _WIN_TARGET = 8;

// id helpers
type TileID = `${number},${number}`;
const _idOf = (lat: number, lng: number): TileID => `${lat},${lng}`;

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
