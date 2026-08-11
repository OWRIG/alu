---
name: select-aluminum-extrusion-connections
description: Select compatible aluminum-extrusion joints and define their machining, fasteners, slot occupancy, access, and assembly order. Use for external brackets, hidden or blind joints, elastic or slot connectors, end-tap screw joints, anchor or whistle connectors, joining plates, three-way corners, splices, hinges, slides, or connector BOM reviews.
---

# Select Aluminum Extrusion Connections

Design each node as an interface, not as a connector name. A complete node includes the exact profiles, connector, nuts, screws, machining, tool access, occupied slots, load path, and assembly sequence.

## Workflow

1. Read [references/connection-methods.md](references/connection-methods.md).
2. If using 嘉立创 FA machining, also read [references/jlcfa-machining-2026.md](references/jlcfa-machining-2026.md). Do not apply that table to another supplier.
3. Make a node schedule. For every joint record:
   - members and their exact interface families;
   - forces the node must transfer and whether it also braces sway;
   - faces or grooves reserved for panels, slides, doors, cables, feet, or later accessories;
   - visibility, cleanability, removability, and adjustment requirements.
4. Choose a primary connection method from the node requirements. Add a separate brace or reinforcement only when the load path needs it.
5. Resolve the exact connector SKU and included hardware. Verify profile family, groove size, fastener thread, engagement, and any excluded profile variants.
6. Add every fabrication operation: end tap, wrench hole, counterbore, blind hole, miter, deburr, or insert. Record the vendor drawing and tolerance.
7. Simulate assembly order:
   - pre-assembly versus post-assembly nuts;
   - connector insertion before closing profile ends;
   - tool access after panels and adjacent members are installed;
   - service removal without dismantling unrelated parts.
8. Return a node-by-node schedule and a procurement boundary. Do not claim a complete BOM when quantities, included fasteners, torque, or machining are unresolved.

## Decision Rules

- “Hidden” describes packaging, not strength. Use rated data or testing for capacity.
- External brackets are a strong default for visible, adjustable, low-machining nodes, but their occupied faces can conflict with inset panels and slides.
- Blind and internal joints preserve outside faces but may require machining, preloading, specific access, or a separate anti-sway strategy.
- End-tap and access-hole joints are compact only when the exact core, tap, screw, hole, and tightening access are compatible.
- Joining plates can align or reinforce members; do not treat an unverified splice as a continuous moment connection.
- A connector SKU that fits the groove can still be wrong for the profile face, wall, core, bracket width, or load direction.
- Never infer tightening torque or rated load from screw diameter, connector appearance, or a tutorial video.
- Keep one slot-occupancy map for the entire assembly. A slot cannot simultaneously host a panel edge, hidden joint, slide, and post-insert nut without an explicit geometry check.

## Minimum Handoff

For every node report the connection purpose, exact parts, compatible profile faces, machining, fasteners, occupied slots, access direction, assembly step, inspection point, evidence level, and unresolved capacity or test requirement.
