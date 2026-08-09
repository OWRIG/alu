---
name: design-with-alu
description: Use ALU to create, adjust, inspect, or explain an industrial aluminum-extrusion concept, especially a mobile overbed table or an existing .alu project. Trigger for aluminum-profile dimensions, frame clearances, flush inset panels, cut-list review, engineering-rule checks, or ALU project handoff.
---

# Design with ALU

Use the ALU desktop editor as the source of truth for project state. Keep claims inside the product's current concept-design boundary.

## Workflow

1. Read [references/current-capabilities.md](references/current-capabilities.md) before changing a project.
2. Capture the physical constraints first:
   - obstacle outside width, height, and depth;
   - required clearance on each side;
   - finished work-surface height and usable depth;
   - floor material, mobility requirement, load, and nearby cables or people.
3. Open ALU. From source, run `pnpm install` once and then `pnpm dev`; for a packaged build, open `ALU.app` or a `.alu` file.
4. Prefer the left-side constraint inputs over editing individual members. For the mobile overbed-table template, change the bed envelope, clearances, frame section, tabletop gap, and target height there.
5. Verify all three outputs after every material change:
   - model: the frame clears the obstacle and the wood panel sits inside the four-sided top-frame pocket;
   - cut list: lengths and source-member counts match the model;
   - checks: every warning is either resolved or recorded as an explicit follow-up.
6. Save through ALU. Do not hand-edit `.alu` JSON: v0.1 has no supported headless write interface, and manual edits bypass UI validation.
7. Report the result with input dimensions, derived envelope, tabletop size and gap, unresolved checks, and the saved file path.

## Decision Rules

- Treat ALU's output as a concept model and profile-only cut list, not an order, fabrication drawing, load rating, or safety approval.
- Measure the assembled top-frame pocket before ordering an error-sensitive wood panel. The configured panel gap is nominal.
- Do not infer connector, machining, caster, fastener, or panel procurement quantities; v0.1 does not model them as orderable BOM lines.
- Keep stable IDs, units, file names, and user-authored names unchanged when switching UI language.
- If a requested operation exceeds current capabilities, state the gap and propose the smallest manual follow-up instead of inventing data.

## Example Requests

- “用 40 系列型材做一张可跨 2,200 mm 床宽的移动桌，木板要平嵌到顶框里。”
- “打开这个 `.alu`，核对桌板尺寸链和长跨梁警告，再告诉我还缺什么采购信息。”
- “Switch the project to English, raise the finished tabletop to 980 mm, save it, and summarize the cut-list delta.”
