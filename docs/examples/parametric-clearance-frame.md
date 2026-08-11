# Example: an agent-readable parametric clearance frame

[简体中文](parametric-clearance-frame.zh-CN.md)

This walkthrough uses the bundled example to show ALU's core loop: capture measured constraints, derive a frame, inspect deterministic outputs, and hand off the unresolved work. The obstacle can represent equipment, furniture, storage, or any other keep-out envelope.

![Parametric Clearance Frame in ALU](../images/editor-en.png)

## 1. Enter measured constraints

| Input                    |    Value | Meaning                                              |
| ------------------------ | -------: | ---------------------------------------------------- |
| Obstacle outer width     | 2,200 mm | Widest measured keep-out envelope                    |
| Left working clearance   |    25 mm | Motion, skew, and measurement allowance              |
| Right working clearance  |    25 mm | Kept independent instead of assuming symmetry        |
| Obstacle top height      |   500 mm | Reference for vertical clearance                     |
| Finished surface height  |   750 mm | Target top face                                      |
| Frame and upright width  |    40 mm | Concept envelope, not a vendor-specific section      |
| Top-frame profile height |    80 mm | Affects upright length and clearance below the beam  |
| Top-frame outer depth    |   500 mm | Overall front-to-back envelope                       |
| Panel gap per side       |     2 mm | Nominal; measure the assembled pocket before cutting |
| Panel thickness          |    18 mm | Sets the support level and top-face relationship     |

## 2. Follow the dimension chain

ALU preserves the inputs and formulas instead of baking them into geometry:

```text
obstacle outer width 2200
+ left clearance 25 + right clearance 25
= clear structural width 2250
+ two profile widths 2 × 40
= frame outer width 2330 mm
```

The inset panel comes from the pocket, not the outer frame:

```text
2250 − 2 × 2 = 2246 mm
```

The nominal panel is `2246 × 416 × 18 mm`. Its top face is flush with the four-sided frame, and the inner support geometry remains conceptual until real hardware is selected.

![Flush inset-panel dimension chain](../images/flush-panel-fit.svg)

## 3. Verify reproducible outputs

After the width edit, the model, bound members, and cut list update together. The profile-only cut list contains four groups and ten source members:

| Purpose             | Cut length | Quantity |
| ------------------- | ---------: | -------: |
| Long-span top beam  |   2,330 mm |        2 |
| Top-frame side rail |     420 mm |        2 |
| Upright             |     670 mm |        4 |
| Base side rail      |     500 mm |        2 |

![Deterministic profile cut list](../images/example-cut-list-en.png)

This list excludes connectors, machining, fasteners, casters, the panel, and accessories. It cannot be used as a purchase order.

## 4. Keep uncertainty explicit

The Checks tab records what the model has not proved. In this example, the long span needs vendor data and a deflection review; a mobile implementation also needs a side-sway strategy, verified casters, and safe cable routing.

![Explainable engineering checks](../images/example-checks-en.png)

An agent handoff should return:

1. measured obstacle envelope and selected clearances;
2. derived frame and inset-panel dimensions;
3. nominal panel gap and the requirement to measure after assembly;
4. grouped profile cuts with source-member counts;
5. every unresolved finding and the evidence still required;
6. the saved `.alu` path.

The `.alu` file is inspectable JSON, but v0.1.1 does not expose a supported headless write API. Apply changes through ALU so schema validation, revision checks, bindings, and derived projections remain intact.
