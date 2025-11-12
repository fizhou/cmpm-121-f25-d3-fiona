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
