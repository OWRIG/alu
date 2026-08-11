---
name: design-with-alu
description: Use ALU to create, adjust, size, inspect, or hand off agent-readable industrial aluminum-extrusion frame concepts and .alu projects. Trigger for aluminum-profile constraints, structured beam load cases, exact-SKU deflection comparison, member geometry, obstacle clearances, flush inset panels, deterministic cut-list review, engineering-rule checks, locale-safe handoff, or requests to work in the ALU desktop editor.
---

# Design with ALU

Use the ALU desktop editor as the source of truth for project state. Keep every conclusion inside the current concept-design boundary.

## Workflow

1. Read [references/current-capabilities.md](references/current-capabilities.md) before changing a project.
2. If the project contains a beam-sizing study or the request asks which profile to use, read [references/structural-sizing.md](references/structural-sizing.md).
3. Capture the physical constraints before changing members:
   - obstacle outside width, height, and depth;
   - required clearance on each side;
   - finished surface height and usable depth;
   - floor, mobility, expected load, cables, and human or child access.
4. Open ALU. From source, run `pnpm install` once and then `pnpm dev`; for a packaged build, open `ALU.app` or a `.alu` file.
5. Prefer the left-side constraint inputs for the bundled parametric clearance frame. Edit individual members only when no input owns the required field.
6. For a long beam, define the loads before selecting a profile:
   - enter measured panel mass, distributed payload, and the required concentrated payload;
   - verify effective support span rather than reusing cut length;
   - verify per-beam load shares, section-height constraint, required interface family, candidate orientation, and exact vendor source;
   - choose only from candidates that meet deflection, geometry, and interface-family constraints, then minimize mass within that eligible set.
7. Verify all four outputs after every material change:
   - model: the frame clears the obstacle and any inset panel sits inside the four-sided pocket;
   - sizing: inputs, formulas, candidate exclusions, selected SKU, and calculation boundary remain consistent;
   - cut list: lengths and source-member counts match the model;
   - checks: every warning is either resolved or recorded as an explicit follow-up.
8. Save through ALU. Do not hand-edit `.alu` JSON: v0.2.0 has no supported headless write interface, and manual edits bypass UI validation.
9. Report the constraints, load assumptions, effective span, candidate comparison, selected SKU and its scope, derived frame envelope, inset-panel fit, cut-list summary, unresolved checks, and saved file path.

## Decision Rules

- Treat ALU's output as a concept model and profile-only cut list, not an order, fabrication drawing, load rating, or safety approval.
- Treat a green beam result as an ideal simply supported deflection screen only. It does not validate allowable material stress, exact connector SKUs, joint flexibility, panel composite action, sway, tipping, casters, impact, fatigue, or the complete frame.
- Do not choose by series name. Require exact SKU, mass per meter, strong-axis inertia, section height, interface family, source URL, effective span, load shares, and formulas.
- “Recommended” means lowest mass among the current eligible candidates. State the candidate-set, geometry, and interface-family boundaries; switching to a taller or different-system profile requires a new study and node design.
- Use Xiaohongshu and field videos for topology and assembly evidence only. Never convert qualitative claims such as “very stable” into a numeric load.
- Measure an assembled, squared pocket before ordering an error-sensitive panel. The configured gap is nominal.
- Do not infer connector, machining, caster, fastener, or panel procurement quantities; v0.2 does not model them as orderable BOM lines.
- Keep stable IDs, units, file names, and user-authored names unchanged when switching UI language.
- Treat `.alu` as inspectable project data, not as a supported agent mutation API. Human or desktop automation must still perform writes through ALU.
- If a requested operation exceeds current capabilities, state the gap and propose the smallest manual follow-up instead of inventing data.

## Example Requests

- “Open this `.alu`, list its measured constraints, derived dimensions, cut groups, and unresolved checks.”
- “Change the obstacle envelope to 2,200 mm, keep 25 mm clearance on each side, and summarize the cut-list delta.”
- “Review the inset-panel fit, flag every assumption that still needs a shop-floor measurement, and save the project.”
- “For this span and load case, compare every embedded vendor SKU, explain each rejection, and return the lowest-mass eligible beam without claiming a rated load.”
