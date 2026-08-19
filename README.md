# patlix-world-web

**Patlix World** — Angular + Three.js third-person open-world client. You inhabit the world as a character; the world is a consumer of the live backend event stream.

## Role

- **Angular**: UI (inspector, task panel, chat, map overlay), auth, WebSocket integration, world state store.
- **Three.js** (no React / no R3F): scene, camera (third-person), terrain, water, buildings, characters, animation, navigation, physics, minimap.
- `WorldStateStore` ← `/world` socket events → `WorldAdapter` → Three.js. **No business logic in the 3D layer.**

## Planned layer map

```
WebSocketService → WorldStateStore (signals)
      → WorldAdapter (state → 3D: spawn/move/pose/animate)
      → Three.js: Scene | Camera | Renderer(WebGPU→WebGL) | Terrain | Water
                  Buildings | Characters | Animation | Navigation | Physics(Rapier) | Interaction | Minimap
PlayerController (keyboard/mouse) · AIBehaviorController (agent state → navmesh → animation)
Shared character rig + animation library for BOTH player and AI.
```

## Run

```bash
npm install
npm start    # http://localhost:4204 (API on :3004)
```

Ports: `4204` (web) / `3004` (api) — arkadion uses :4201/:3001, falina :4202/:3002, aurel-dashboard :4203/:3003.

## Milestones (build order)

- M4 web shell: WS service, WorldStateStore, WorldAdapter, inspector/map/chat UI
- M5 3D world: renderer, terrain, water, trees, sky, lighting, HQ building
- M6 character system: shared rig + animation controller + GLB loader
- M7 player controller + third-person camera + Rapier physics
- M8 AI behavior controller + minimap/waypoint/compass + interaction prompts
- M9 end-to-end scenario + observability + approvals
- M10 hardening: minimap zone labels, Rapier 0.20 heightfield migration, port migration (4204/3004), camera-relative forward fix

See `PATLIX_WORLD_DECISIONS.md` at the workspace root for the full decision log.