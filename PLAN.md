# Demo 3: Token Game

# Game Design Vision

... tbd ...

# Technologies

- TypeScript
- CSS
- Deno & Vite
- GitHub Actions & GitHub Pages

# Assignments

## D3.A: Core Mechanics

Key Technical Challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key Gameplay Challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a rectangle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] clickable grid of cells to pick up and drop token
- [x] crafting of tokens

## D3.B: Globe-Spanning Gameplay

Key Technical Challenge: Can you set up your implementation to support gameplay anywhere in the real world, not just locations near our classroom?
Key Gameplay Challenge: Can players craft an even higher value token by moving to other locations to get access to additional crafting materials?

### Steps

- [x] replace logic that uses lat, lng with i, j identifiers
- [ ] create small helper functions for coordinate conversion
- [ ] render cells across the entire map
- [ ] add player movement controls
- [ ] add nearby player cell only interaction
- [ ] make cells memoryless when not in view
- [ ] update token crafting goal to a larger value
- [ ] add moveend event to spawn and despawn cells
