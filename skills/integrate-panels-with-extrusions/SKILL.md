---
name: integrate-panels-with-extrusions
description: Design fixed infills, flush inset shelves or worktops, removable panels, and sliding or hinged panels for aluminum-extrusion frames. Use when choosing groove insertion, gaskets, panel retainers, shelf supports, cleats, face mounting, panel gaps, board thickness, or an assembly-safe panel dimension chain.
---

# Integrate Panels With Extrusions

Start from the panel's function and load path. “Put the board in the slot” is not a specification until the support geometry, retention, clearance, material behavior, connector interference, and assembly order are resolved.

## Workflow

1. Read [references/panel-integration-methods.md](references/panel-integration-methods.md).
2. Classify the panel:
   - non-structural fixed infill;
   - shelf or worktop carrying load;
   - removable access panel;
   - sliding or hinged door;
   - cosmetic cover.
3. Lock the exact profile and connector system. Draw the usable groove or pocket after brackets, fasteners, slides, and adjacent members are present.
4. Choose the mounting method from the required load, thickness, removability, appearance, and assembly order.
5. Build a dimensional chain from vendor drawings and measured geometry:
   - groove engagement or retainer offset;
   - measured clear opening or squared pocket;
   - per-side installation and movement allowance;
   - panel thickness, edge treatment, and hardware setback.
6. Check the panel separately from the frame. Verify panel bending, local bearing, screw withdrawal or insert pull-out, retainer capacity, edge distance, impact, and moisture or thermal movement as applicable.
7. Dry-assemble and square the frame before ordering an error-sensitive panel. Use a cheap template for custom corner notches, irregular pockets, glass, or expensive finished boards.
8. Return the mounting method, dimension chain, exact hardware, support spacing, assembly sequence, service method, and unresolved tests.

## Decision Rules

- There is no universal panel thickness or gap for a `20`, `30`, or `40` profile. Use the exact groove, gasket, clip, support, or retainer drawing.
- A groove-captured infill is not automatically a load-bearing shelf. State whether the panel carries load or only closes an opening.
- A flush inset shelf must sit on a defined bearing surface; four tiny supports and continuous cleats are different structural systems.
- Keep panel edges clear of external brackets, screw heads, hidden-joint access holes, and slide hardware.
- Allow material movement. Do not rigidly trap a wide solid-wood panel across the grain; use appropriate slots or floating retention.
- Treat adhesive or tape as secondary retention unless the joint was explicitly designed and validated for the substrate, surface preparation, temperature, moisture, peel, and aging.
- Use rated, material-appropriate hardware for glass and brittle sheet. Do not field-drill tempered glass.
- Record panel material, grade, thickness, finish, edge treatment, and cut tolerance as procurement data, not prose.

## Minimum Handoff

Report panel function and material, exact frame pocket, chosen mounting family and parts, nominal cut size with formula, per-side allowances, bearing or fastener layout, slot conflicts, assembly order, removal path, load checks, field measurements, and proof-test requirements.
