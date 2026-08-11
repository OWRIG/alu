---
name: select-aluminum-extrusion-profiles
description: Select and verify industrial aluminum-extrusion families, orientations, and exact SKUs from geometry, load cases, deflection limits, interfaces, and current vendor data. Use when comparing 2020/3030/4040 or rectangular profiles, checking slot-system compatibility, choosing light/standard/heavy variants, or replacing rule-of-thumb profile advice with traceable calculations.
---

# Select Aluminum Extrusion Profiles

Do not select a member from `2020`, `3030`, or `4040` alone. Treat those labels as search hints; the deliverable is an exact, sourced profile definition in a declared orientation.

## Workflow

1. Read [references/profile-systems.md](references/profile-systems.md).
2. Capture the design inputs before listing candidates:
   - effective span and support condition;
   - distributed, concentrated, dynamic, and accidental loads;
   - number of members sharing each load and the basis for that share;
   - deflection criterion, stress criterion if available, and safety boundary;
   - maximum section width and height;
   - required slot/interface family, finish, environment, and vendor region.
3. Lock the compatibility tuple: vendor/system, modular base, slot opening, groove geometry, core/tap interface, and accessory family. Keep every unknown explicit.
4. Build an exact-SKU candidate table. For each orientation record source revision/date, dimensions, mass per metre, `Ix`, `Iy`, section modulus when available, slot family, core/tap data, and finish.
5. Recalculate every candidate with its own self-weight. Use the effective support span, not the extrusion cut length.
6. Filter candidates in this order:
   - geometry and required interfaces;
   - deflection and any declared stress limit;
   - mass, cost, appearance, and availability.
7. Recheck node feasibility. A beam that passes bending but cannot accept the selected connector, panel, caster, or machining operation is not eligible.
8. Return the candidate table, formulas, exclusions, selected SKU and orientation, source links, and unresolved verification work.

## Decision Rules

- Never translate a social-media claim such as “3030 is enough” into a load rating.
- Never assume two profiles with the same outer dimensions share nuts or brackets. Mixed families require a named transition part or a separately designed interface.
- Rectangular profiles gain directional stiffness only when the strong axis is oriented correctly. Record the vertical dimension and the matching inertia.
- Treat light, standard, and high-rigidity sections as different SKUs. Outer dimensions do not determine inertia.
- Separate serviceability from strength. Passing deflection does not validate joints, local slot failure, sway, tipping, buckling, impact, fatigue, or the complete structure.
- Vendor “allowable load” tables are valid only for their stated support, load, length, and deflection assumptions.
- If exact section properties or the current catalog source are unavailable, stop at a shortlist and request the missing data. Do not interpolate across unrelated SKUs.

## Minimum Handoff

Report:

- requirements and load cases;
- effective span and boundary condition;
- exact candidate SKUs, revision dates, orientations, section properties, and interface families;
- formula and unit trail;
- eligibility and rejection reason for every candidate;
- chosen SKU and why it wins within the declared candidate set;
- connector, panel, stability, fabrication, and proof-test items still outside the calculation.
