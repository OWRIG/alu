# ALU v0.1 capability boundary

## Supported now

| Area        | Supported behavior                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Constraints | Edit the mobile overbed-table template's space, clearance, frame, height, panel, and nominal-gap inputs. |
| Geometry    | Recompute bound profile members and show a read-only 3D projection in millimetres.                       |
| Panel fit   | Show a wood panel inset inside a four-sided top-frame pocket with configurable per-side gap.             |
| Members     | Add, remove, select, and edit rectangular profile members.                                               |
| Cut list    | Deterministically group profile lines by definition revision, length, orientation, and use.              |
| Checks      | Show explainable warnings with rule ID, reason, confidence, and next action.                             |
| Files       | Open, validate, atomically save, reopen, and track recent `.alu` v1 files.                               |
| Language    | Use one complete `zh-CN` or `en-US` interface at a time, including native dialogs.                       |

## Not supported now

- Order-ready connectors, fasteners, machining, casters, panels, or accessories.
- Structural analysis, deflection calculation, certified load rating, or compliance approval.
- Dragging, snapping, joints, or parametric-template authoring in the 3D viewport.
- A supported CLI or headless API for creating or modifying `.alu` files.

## Dimension semantics

- Domain coordinates are millimetres with Z up. The viewport adapts them to Three.js; viewport coordinates never write back to the project.
- For the bundled table template:
  - inner frame width = obstacle width + left clearance + right clearance;
  - outer frame width = inner frame width + two profile widths;
  - tabletop width = inner frame width − two nominal panel gaps;
  - the panel is supported conceptually inside the top-frame pocket, not placed on top of it.
- Values persisted by commands are quantized to 0.01 mm.

## Required handoff

Always include:

1. measured obstacle envelope and selected clearances;
2. derived outer frame and tabletop dimensions;
3. nominal panel gap per side;
4. profile-only cut-list summary;
5. unresolved checks and real-world measurements still required;
6. saved `.alu` path, if one was produced.
