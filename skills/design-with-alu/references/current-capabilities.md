# ALU capability boundary

## Supported now

| Area        | Supported behavior                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Constraints | Create, edit, and safely remove input parameters and explicit linear derived parameters; edit the bundled clearance-frame inputs.                                        |
| Geometry    | Recompute bound profile members and show a read-only 3D projection in millimetres.                                                                                       |
| Panel fit   | Show a panel inset inside a four-sided top-frame pocket with configurable per-side gap.                                                                                  |
| Beam sizing | Edit kg loads; compare exact SKUs; optionally filter interface family; select the lowest-mass eligible candidate; explicitly apply it to the studied beams and cut list. |
| Members     | Add, remove, select, and edit rectangular profile members.                                                                                                               |
| Cut list    | Deterministically group profile lines by definition revision, length, orientation, and use.                                                                              |
| Checks      | Show explainable warnings with rule ID, reason, confidence, and next action.                                                                                             |
| Files       | Open, validate, atomically save, reopen, and track recent `.alu` v1 files.                                                                                               |
| Language    | Start in `zh-CN`; provide a complete `en-US` interface, including native dialogs, with local persistence.                                                                |

## Not supported now

- Order-ready connectors, fasteners, machining, casters, panels, or accessories.
- Complete structural analysis, joint or frame stiffness, material allowable-stress approval, certified load rating, or compliance approval.
- Dragging, snapping, joints, or formula strings in the 3D viewport.
- A supported CLI or headless API for creating or modifying `.alu` files.

## Dimension semantics

- Domain coordinates are millimetres with Z up. The viewport adapts them to Three.js; viewport coordinates never write back to the project.
- For the bundled clearance-frame example:
  - inner frame width = obstacle width + left clearance + right clearance;
  - outer frame width = inner frame width + two profile widths;
  - inset-panel width = inner frame width − two nominal panel gaps;
  - the panel is supported conceptually inside the top-frame pocket, not placed on top of it.
  - upright cut length subtracts the measured caster installed height; `0` means unresolved.
- Values persisted by commands are quantized to 0.01 mm.

## Beam-sizing semantics

- The effective span is a derived support-center distance, not the profile cut length.
- Uniform panel and payload masses use the stored per-beam share; the concentrated payload uses its own worst-beam share; each candidate adds its self-weight.
- The current study superposes simply supported uniform-load and midspan-point-load deflection using the embedded modulus and inertia.
- Eligibility requires the deflection criterion, the stored section-height constraint, and the interface family only when one is configured. Selection then minimizes mass per meter inside that eligible set.
- Selection is advisory until explicitly applied. Once applied, the model, exact definition snapshot, and cut list must show the same SKU.
- Candidate catalog values and calculation sources travel inside `.alu`; optional construction evidence remains a separate layer.

## Required handoff

Always include:

1. measured obstacle envelope and selected clearances;
2. derived outer frame and tabletop dimensions;
3. inset-panel size and nominal gap per side, when present;
4. profile-only cut-list summary;
5. structured loads, effective span, load shares, any interface-family filter, candidate comparison, selected and applied SKU, and the limited meaning of “pass”;
6. unresolved checks and real-world measurements still required;
7. saved `.alu` path, if one was produced.
