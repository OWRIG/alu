# ALU

[简体中文](README.zh-CN.md)

**An agent-friendly workspace for industrial aluminum-extrusion design.**

ALU turns measured constraints into an inspectable frame model, a deterministic profile cut list, and explicit engineering review items. Its strict `.alu` project format keeps stable IDs, revisions, inputs, derived dimensions, member geometry, and evidence together, so a person and an agent can reason about the same design state.

![ALU editor in English](docs/images/editor-en.png)

> ALU 0.1.1 alpha produces concept geometry and a profile-only cut list. It is not an order, fabrication drawing, structural calculation, load rating, or safety approval.

## Why ALU is agent-friendly

- **One inspectable project truth.** `.alu` v1 is validated JSON with explicit units, stable entity IDs, project revisions, and a deterministic design hash.
- **Inputs stay separate from results.** Measured constraints, linear derived dimensions, and member bindings remain traceable instead of collapsing into anonymous mesh geometry.
- **Outputs are reproducible.** The same project produces the same grouped profile cut list and rule findings; stale saved projections are recalculated on open.
- **Warnings carry context.** Findings expose a stable rule ID, rationale, evidence type, confidence, affected entities, and suggested follow-up.
- **The workflow is versioned with the product.** The bundled [`design-with-alu`](skills/design-with-alu/SKILL.md) Skill teaches an agent what to inspect, what to report, and where the alpha boundary is.
- **Humans can verify every step.** The desktop UI shows the constraints, model, members, cut list, and checks that an agent references in its handoff.

```mermaid
flowchart LR
  A["Design brief"] --> B["$design-with-alu<br/>workflow + guardrails"]
  B --> C["ALU desktop UI<br/>validated edits"]
  C <--> D[".alu v1<br/>canonical project data"]
  D --> E["3D projection<br/>cut list<br/>rule findings"]
  E --> F["Agent-readable handoff"]
```

The current Skill guides desktop work; v0.1.1 does not yet provide a supported headless mutation API. Do not bypass validation by hand-editing `.alu` files.

## What ships now

- Parametric constraints for obstacle envelope, working clearance, finished height, frame occupancy, and inset-panel fit.
- A bundled clearance-frame example whose inputs update bound members in one domain command.
- Read-only 3D review in a millimeter coordinate system, with a four-sided flush inset-panel pocket.
- Add, remove, select, and numerically edit rectangular profile members.
- Deterministic profile cut-list grouping by definition revision, length, orientation, and purpose.
- Explainable design checks without presenting field-guide heuristics as structural proof.
- Strict `.alu` v1 validation, atomic save, recent projects, and BOM recalculation on reopen.
- English-first interface with a complete Simplified Chinese entry, including native file dialogs.
- A constrained Electron boundary: no Node/Electron access in the renderer, narrow validated IPC, restrictive production CSP, ASAR, and fuses.

## Install

### macOS Apple Silicon

Download `ALU-0.1.1-arm64.dmg` from the [v0.1.1 prerelease](https://github.com/OWRIG/alu/releases/tag/v0.1.1), then drag ALU into Applications.

The build is Developer ID signed but not Apple-notarized. Gatekeeper may block the first launch. Verify the release SHA-256 and source before using the documented open procedure.

### Run from source

Requires Node.js 22+ and pnpm 10.

```bash
git clone https://github.com/OWRIG/alu.git
cd alu
pnpm install
pnpm dev
```

## Five-minute design loop

The bundled example starts with a generic obstacle envelope rather than a furniture category:

1. Set `Obstacle outer width` to `2200 mm` and keep `25 mm` working clearance on each side.
2. ALU derives a `2250 mm` clear opening and a `2330 mm` outer frame.
3. With a nominal `2 mm` gap per side, the inset panel becomes `2246 × 416 × 18 mm`.
4. Review the 3D pocket, four profile cut groups, ten source members, and every unresolved check.
5. Save the `.alu` project and hand off its inputs, derived dimensions, cut-list summary, findings, and remaining real-world measurements.

![Deterministic profile cut list](docs/images/example-cut-list-en.png)

See the [illustrated parametric clearance-frame example](docs/examples/parametric-clearance-frame.md).

## Use the Agent Skill

Install from the repository:

```bash
mkdir -p ~/.codex/skills
cp -R skills/design-with-alu ~/.codex/skills/
```

Then invoke it explicitly:

```text
Use $design-with-alu to inspect this .alu project and return its constraints,
derived dimensions, cut groups, unresolved checks, and required field measurements.
```

The release also includes `design-with-alu-0.1.1.zip` as a standalone download.

## Boundaries that matter

- Built-in 4040/4080 definitions are low-confidence rectangular envelopes. Verify the exact vendor catalog before procurement.
- The inset-panel dimensions are nominal. Assemble and square the frame, then measure the actual pocket before ordering a tolerance-sensitive panel.
- The v0.1.1 cut list excludes connectors, machining, fasteners, casters, panels, and accessories. It is not order-ready.
- Long-span, side-sway, floor, caster, and cable findings are review prompts, not load conclusions.
- Dragging, snapping, joints, complete procurement BOMs, custom catalogs, and the headless Agent interface remain later roadmap work.

## Verify and package

```bash
pnpm ready           # types, lint, format, boundaries, spec gate, tests, build
pnpm test:e2e        # real Electron locale, edit, cut-list, save, reopen flow
pnpm package:mac     # Apple Silicon DMG, ZIP, and unpacked ALU.app
pnpm package:verify  # ASAR, locale packs, executable, and size limits
pnpm test:package    # repeat the critical flow against the packaged app
```

## Documentation

- [Illustrated clearance-frame example](docs/examples/parametric-clearance-frame.md)
- [Current product behavior](docs/product-spec/specs/README.md)
- [Architecture](docs/engineering/architecture.md)
- [Domain model and `.alu` format](docs/engineering/domain-model.md)
- [Testing strategy](docs/engineering/testing-strategy.md)
- [Engineering-rule catalog](docs/domain/engineering-rule-catalog.md)
- [Roadmap](docs/product-spec/roadmap.md)

The earlier overbed-table request remains available as a [domain-specific fixture walkthrough](docs/examples/mobile-overbed-table.md); it is an example, not ALU's product positioning.
