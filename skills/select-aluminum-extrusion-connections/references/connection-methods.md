# Aluminum-extrusion connection methods

Checked 2026-08-11. Names vary by supplier; map each method to an exact current SKU and drawing.

## Method matrix

| Method                                              | Useful when                                                             | Main costs and risks                                                                 | Assembly notes                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| External cast, extruded, or sheet bracket           | Low machining, visible adjustable joint, easy reinforcement             | Occupies outer faces and slots; may clash with inset panels, slides, or feet         | Usually supports post-assembly nuts and later adjustment; verify anti-rotation tabs and bracket face width.       |
| External joining plate                              | Coplanar corner, tee, splice alignment, or after-the-fact reinforcement | Exposed plate; an untested splice is not a rigid continuous beam                     | Bosch documents plates that leave inner slots free and can be added after initial assembly.                       |
| Internal or blind bracket                           | Clean outside face, door or panel opening, restricted external envelope | May rely on set screws or groove bearing; capacity and gap behavior are SKU-specific | Some are post-insert; others must enter from the profile end. Tool access can disappear after panel installation. |
| Elastic, spring, or simple slot connector           | Fast positioning and light-duty face-to-side assembly                   | Small groove contact and product-specific preload; do not assume it braces a frame   | Often reduces machining, but insertion direction and exact groove family still govern.                            |
| End-tap screw joint plus wrench hole or counterbore | Compact right-angle joint with face-to-end contact                      | Requires a compatible core, tap, hole, screw, access, and controlled machining       | Specify which member is tapped, which is drilled, hole direction, screw, and tightening sequence.                 |
| Anchor connector                                    | Concealed joint with supplier-defined cross-hole geometry               | Dedicated hole position, connector, and profile wall relationship                    | Use the vendor equation and tolerance. Do not copy the hole to another family.                                    |
| Whistle or wedge connector                          | Concealed face-to-end connection using a blind pocket                   | Large dedicated blind hole; connector variants differ by family                      | Order machining with the profile when possible; confirm pocket orientation and access.                            |
| Two-way or three-way corner connector               | Exposed terminal corner and compact multi-axis assembly                 | Usually requires end taps and caps; may lock the assembly sequence                   | Useful at true endpoints, not automatically suitable for intermediate tees.                                       |
| Linear or slot splice connector                     | Alignment or extension where shipping length is limited                 | Often transfers limited moment unless specifically rated and tested                  | Preserve continuity with plates or a designed overlap when bending governs.                                       |
| Hinge, pivot, slide, or moving connector            | Doors, folding members, drawers, and motion systems                     | Adds clearance, wear, alignment, and dynamic-load requirements                       | Treat as a motion interface, not as a generic rigid corner.                                                       |

## Node-selection questions

1. What force and moment components must cross the node?
2. Does the node also prevent racking, or is diagonal, panel, or frame bracing separate?
3. Which faces and grooves must remain free?
4. Can the connector and nuts be inserted after the surrounding frame is closed?
5. Can a tool reach the fastener after panels, slides, feet, and neighboring members are installed?
6. Which machining operations and tolerances belong to which member face and end?
7. Is the connection expected to be adjustable, removable, cleanable, hidden, or tamper-resistant?
8. What rated data or physical test covers the exact load direction?

## Fastener and BOM discipline

- Distinguish pre-assembly nuts from post-assembly nuts. A correct thread does not make the wrong insertion type installable.
- Record screw standard, thread, length, head type, washer, nut or insert, quantity, material, coating, and whether the connector package includes it.
- Verify thread engagement and bottoming against the exact tap depth and screw length.
- Keep machining as explicit BOM operations tied to part IDs and orientations.
- Do not invent torque. Use the connector or fastener supplier's value for the exact joint, or leave it unresolved.
- Record spare or service access separately from initial assembly access.

## 2026 field evidence

- A March 2026 nine-method comparison using 3030 欧标 profiles reports that external brackets are easy and broadly applicable but interfere with inset panels; internal set-screw connectors look cleaner but may leave gaps; coplanar plates are better treated as reinforcement than a sole joint. These are useful construction observations, not rated-load evidence.
- A cabinet revision posted one day before the 2026-08-11 review removed tapping and holes from drawer supports by switching to internal brackets. It demonstrates a real fabrication-cost and assembly tradeoff, not proof that the revised node has equivalent strength.
- 豪佳铝业 continued publishing connection tutorials in July and August 2026. Their videos are useful for part recognition and assembly sequence; numeric capacity still requires the exact supplier data or a test.

## Sources

- [MISUMI N-Series profile page: bracket versus blind-joint characteristics and machining](https://th.misumi-ec.com/en/vona2/detail/110311092599/).
- [MISUMI blind-joint parts](https://uk.misumi-ec.com/vona2/mech/M1500000000/M1501000000/M1501030000/M1501030400/).
- [Bosch Rexroth Aluminum Framing 9.0 catalog](https://apps.boschrexroth.com/DCUS/2023/08.25.AT_Uploads/R999001283_2020-09_media-1.pdf), joining plates at catalog page 3-65.
- [嘉立创 FA 型材配件目录](https://www.jlcfa.com/catalog/T/T02), checked 2026-08-11.
- [小红书：9 种直角连接方式详解](https://www.xiaohongshu.com/explore/6996ea30000000000a02e121), low-level field evidence, 2026-03-01.
- [小红书：三层铝型材收纳柜清单分享](https://www.xiaohongshu.com/explore/6a78882e0000000022031498), low-level field evidence, shown as one day old on 2026-08-11.
- [小红书：豪佳铝业连接教程](https://www.xiaohongshu.com/explore/6a79be8a000000003301c346), low-level video evidence, shown as the previous day on 2026-08-11.
