---
name: design-with-alu
description: Use ALU's headless CLI or desktop editor to create, dry-run, modify, validate, size, inspect, review, or explicitly release agent-readable industrial aluminum-extrusion frame concepts and .alu projects. Trigger for aluminum-profile constraints, manufacturing-friendly cut normalization, fabrication tolerances, structured beam load cases, exact-SKU deflection comparison, member geometry, obstacle clearances, flush inset panels, deterministic cut-list review, engineering-rule checks, review previews, approved JSON/Markdown/PDF handoffs, or requests to work with ALU.
---

# Design with ALU

Use the `.alu` project as the source of truth. Mutate it only through the ALU CLI or desktop editor, never by editing JSON directly. Keep every conclusion inside the current concept-design boundary, and treat every artifact as review-only until the current project revision has passed its release gate.

## Companion Skills

- Apply `$design-aluminum-profile-furniture` before normalizing cut lengths or trading geometric and ergonomic margins for fabrication simplicity. It owns the dimension-chain and manufacturing-friendly normalization rules; ALU owns project mutation and validation.
- Apply `$select-aluminum-extrusion-profiles` before choosing a family, orientation, or exact profile SKU from loads and geometry.
- Apply `$select-aluminum-extrusion-connections` before naming connector SKUs, machining, fasteners, occupied slots, or assembly order.
- Apply `$integrate-panels-with-extrusions` before fixing panel thickness, support method, pocket gaps, retention, or door motion.

The companion skills are vendor-neutral decision workflows. ALU remains the source of truth for the project model and its current supported fields.

## Workflow

1. Read [references/current-capabilities.md](references/current-capabilities.md) before changing a project.
2. Read [references/headless-cli.md](references/headless-cli.md) before using the CLI. If the project contains a beam-sizing study or the request asks which profile to use, also read [references/structural-sizing.md](references/structural-sizing.md) and apply the profile-selection companion skill.
3. Resolve `scripts/alu` relative to this `SKILL.md` and use it as `ALU_CLI`. Run `"$ALU_CLI" help`. The ALU installer writes the exact application path into this launcher; do not require Node.js or pnpm. From a source checkout only, fall back to `pnpm build:cli` once and then `pnpm cli`.
4. Capture the physical constraints before changing members:
   - obstacle outside width, height, and depth;
   - required clearance on each side;
   - finished surface height and usable depth;
   - floor, mobility, expected load, cables, and human or child access.
5. If no project exists, create one with `alu create <file>.alu --template blank`; use `--template demo` only when the bundled clearance-frame starting point matches the task. Otherwise run `alu read <file>.alu` and keep its revision and design hash.
6. Build the dimension chain before editing repeated member coordinates:
   - create measured values as input parameters;
   - create derived values as explicit linear terms plus a constant;
   - bind member fields to those parameters;
   - edit individual members only when no parameter owns the field.
     For mobile frames, include a measured `casterInstalledHeight`; `0` means unresolved and must not be treated as a finished cut length.
   - If the user prefers fabrication-friendly numbers, calculate the unrounded design first, then use only explicit tolerances to propose nominal cuts. Propagate the change through parameters and recheck clearance, finished height, effective span, sizing, panel pocket, and BOM; never round independent members or catalog interfaces in place.
7. For a long beam, define the loads before selecting a profile:
   - enter measured panel mass, distributed payload, and the required concentrated payload;
   - verify effective support span rather than reusing cut length;
   - verify per-beam load shares, section-height constraint, required interface family, candidate orientation, and exact vendor source;
   - choose only from candidates that meet deflection, geometry, and interface-family constraints, then minimize mass within that eligible set.
8. Build one version-1 command envelope using caller-provided stable IDs. Copy `expectedProjectRevision` and `expectedDesignHash` from the latest read. Get command JSON Schema and ready-to-copy generic profile snapshots from `alu schema command`; never calculate or invent a definition hash.
9. Run `alu dry-run <file>.alu --input <command>.json`. Review every entity, parameter, BOM, and rule delta. If the preview is correct, apply the exact same envelope with `alu apply`; on a conflict, read again instead of forcing the write.
10. After reviewing the result, explicitly apply the selected SKU to the studied beams. A recommendation that still leaves any `Concept … Envelope` in the studied beam model or cut list has not completed the design loop. Never auto-apply a new SKU just because loads changed.
11. Verify all four outputs after every material change:

- model: the frame clears the obstacle and any inset panel sits inside the four-sided pocket;
- sizing: inputs, formulas, candidate exclusions, selected SKU, and calculation boundary remain consistent;
- cut list: lengths and source-member counts match the model;
- checks: every warning is either resolved or recorded as an explicit follow-up.

12. Run `"$ALU_CLI" validate` for the intended next state. Use `edit` or `order-draft` while the design is still changing; use `order-ready` only for a release review. A passing `order-ready` result is an automated check, not human approval. Use the desktop editor when a human needs 3D review or manual adjustment; its saves share the same file lock and reject external-change conflicts.
13. Classify the requested artifact before creating it:
    - Working state: keep the `.alu`, in-app 3D view, and chat summary. If the user explicitly asks for a file or image for review, label it visibly and in its filename as `review` or `concept · not for ordering`; never describe it as final or externally released.
    - Formal release: externally shareable renders or product sheets, Markdown/PDF/JSON handoffs, procurement files, and anything presented as final. Do not create or refresh these as a side effect of editing, validating, or showing the project.
14. Before a formal release:
    - require `order-ready` validation to pass and require every remaining warning to be resolved or explicitly accepted;
    - show the human the current revision and design hash, summarize the release boundary, and obtain explicit confirmation that this exact version is frozen for formal output; do not infer confirmation from “finish,” “show me,” earlier broad authorization, or a request to keep designing;
    - immediately read or validate again after confirmation. If the revision or design hash changed, the confirmation is invalid and the project returns to review;
    - export through ALU with `--target order-ready`, then record the returned BOM hash. Use Markdown by default only when the user requested a formal handoff; use PDF or JSON when requested. Markdown and branded PDF must come from the same `reportVersion` JSON.
15. If the gate is incomplete, return the saved `.alu` path, review status, blockers, and next confirmation needed; state that no formal output was created. After release, return the immutable release paths, revision, design hash, BOM hash, and accepted warnings. Any later project change invalidates the release; never silently overwrite or reuse the old files as current.

## Decision Rules

- Treat ALU's output as a concept model and profile-only cut list, not an order, fabrication drawing, load rating, or safety approval.
- Treat `order-ready` as machine validation only. ALU v0.2 does not persist a human approval or release state, so the Skill must pause for explicit confirmation before creating formal output.
- Do not generate an external render, product sheet, handoff, or procurement-facing file merely because a model edit is complete. Review previews must carry a visible non-orderable label; released files must bind to the confirmed revision and hashes.
- Any edit after confirmation invalidates that confirmation and every prior release artifact as the current version. Preserve old files as history unless the user explicitly asks to remove them.
- Treat a green beam result as an ideal simply supported deflection screen only. It does not validate allowable material stress, exact connector SKUs, joint flexibility, panel composite action, sway, tipping, casters, impact, fatigue, or the complete frame.
- Do not choose by series name. Require exact SKU, mass per meter, strong-axis inertia, section height, interface family, source URL, effective span, load shares, and formulas.
- “Recommended” means lowest mass among the current eligible candidates. State the candidate-set, geometry, and interface-family boundaries; switching to a taller or different-system profile requires a new study and node design.
- Field videos are optional construction evidence, regardless of platform. Never convert qualitative claims such as “very stable” into a numeric load or make one platform a prerequisite for beam calculation.
- Measure an assembled, squared pocket before ordering an error-sensitive panel. The configured gap is nominal.
- Do not infer connector, machining, caster, fastener, or panel procurement quantities; v0.2 does not model them as orderable BOM lines.
- Keep stable IDs, units, file names, and user-authored names unchanged when switching UI language.
- Treat the CLI command protocol as the only supported agent mutation API. Never hand-edit `.alu`, bypass dry-run, ignore revision/design conflicts, or reuse a stale envelope after another writer changes the project.
- If a requested operation exceeds current capabilities, state the gap and propose the smallest manual follow-up instead of inventing data.

## Example Requests

- “Open this `.alu`, list its measured constraints, derived dimensions, cut groups, and unresolved checks.”
- “Change the obstacle envelope to 2,200 mm, keep 25 mm clearance on each side, and summarize the cut-list delta.”
- “Replace awkward cut lengths with fabrication-friendly nominal sizes, show which tolerances are consumed, and recompute height, span, deflection, panel fit, and BOM before applying.”
- “Review the inset-panel fit, flag every assumption that still needs a shop-floor measurement, and save the project.”
- “For this span and load case, compare every embedded vendor SKU, explain each rejection, and return the lowest-mass eligible beam without claiming a rated load.”
- “Prepare this project for order-ready review, but do not export a formal handoff until I confirm the frozen revision.”
