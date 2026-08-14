# Character assets

Drop Mixamo-compatible GLB characters here and they are loaded automatically
per agent (by lowercased agent name). While a file is missing, the world uses
the built-in procedural rig.

Naming (agent name → file):

| Agent          | File                      |
| -------------- | ------------------------- |
| Aurel          | `aurel.glb`               |
| Developer-01   | `developer-01.glb`        |
| Designer-01    | `designer-01.glb`         |
| Player (M7)    | `player.glb`              |

Each GLB should include animation clips. Clip names are matched by keyword:

- idle: `Idle`, `Standing`
- walk: `Walk`, `Walking`, `Run`
- work: `Typing`, `Writing`, `Talking`, `Work`
- blocked: `Stumble`, `Sitting`, `Sad`

If no matching clip exists, the first clip is used for idle and the model
stands still otherwise.

Source assets: FBX/Blender/Mixamo → export GLB. Runtime is GLB/GLTF only.