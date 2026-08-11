---
name: design-with-alu
description: Use ALU to create, adjust, inspect, or hand off agent-readable industrial aluminum-extrusion frame concepts and .alu projects. Trigger for aluminum-profile constraints, member geometry, obstacle clearances, flush inset panels, deterministic cut-list review, engineering-rule checks, locale-safe handoff, or requests to work in the ALU desktop editor.
---

# Design with ALU

Use the ALU desktop editor as the source of truth for project state. Keep every conclusion inside the current concept-design boundary.

## Workflow

1. Read [references/current-capabilities.md](references/current-capabilities.md) before changing a project.
2. Capture the physical constraints before changing members:
   - obstacle outside width, height, and depth;
   - required clearance on each side;
   - finished surface height and usable depth;
   - floor, mobility, expected load, cables, and human or child access.
3. Open ALU. From source, run `pnpm install` once and then `pnpm dev`; for a packaged build, open `ALU.app` or a `.alu` file.
4. Prefer the left-side constraint inputs for the bundled parametric clearance frame. Edit individual members only when no input owns the required field.
5. Verify all three outputs after every material change:
   - model: the frame clears the obstacle and any inset panel sits inside the four-sided pocket;
   - cut list: lengths and source-member counts match the model;
   - checks: every warning is either resolved or recorded as an explicit follow-up.
6. Save through ALU. Do not hand-edit `.alu` JSON: v0.1.1 has no supported headless write interface, and manual edits bypass UI validation.
7. Report the inputs, derived frame envelope, inset-panel size and nominal gap when present, cut-list summary, unresolved checks, and saved file path.

## Decision Rules

- Treat ALU's output as a concept model and profile-only cut list, not an order, fabrication drawing, load rating, or safety approval.
- Measure an assembled, squared pocket before ordering an error-sensitive panel. The configured gap is nominal.
- Do not infer connector, machining, caster, fastener, or panel procurement quantities; v0.1 does not model them as orderable BOM lines.
- Keep stable IDs, units, file names, and user-authored names unchanged when switching UI language.
- Treat `.alu` as inspectable project data, not as a supported agent mutation API. Human or desktop automation must still perform writes through ALU.
- If a requested operation exceeds current capabilities, state the gap and propose the smallest manual follow-up instead of inventing data.

## Example Requests

- “Open this `.alu`, list its measured constraints, derived dimensions, cut groups, and unresolved checks.”
- “Change the obstacle envelope to 2,200 mm, keep 25 mm clearance on each side, and summarize the cut-list delta.”
- “Review the inset-panel fit, flag every assumption that still needs a shop-floor measurement, and save the project.”
