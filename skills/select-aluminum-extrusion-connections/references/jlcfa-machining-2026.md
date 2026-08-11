# 嘉立创 FA machining map — 2026 snapshot

Checked against the official [process page](https://xc.jlcfa.com/process) on 2026-08-11.

These are supplier-specific template operations, not universal aluminum-extrusion dimensions. Recheck the selected profile code and current process page before ordering. Nonstandard work requires a drawing and supplier confirmation.

## End tapping

| JLCFA family or listed exception                           |             Published center bore | Thread | Standard depth |
| ---------------------------------------------------------- | --------------------------------: | -----: | -------------: |
| 欧标 2020D                                                 |                            4.2 mm |     M5 |          12 mm |
| 欧标 20; 欧标 30 `J6060S`; 国标 30                         |                            5.0 mm |     M6 |          15 mm |
| 欧标 30; 欧标 40 槽 8; 国标 40                             |          6.8 / 7 mm as applicable |     M8 |          20 mm |
| 国标 40 `TXCQ-4040`                                        |                            8.8 mm |    M10 |          24 mm |
| 欧标 40 槽 10; 欧标 45                                     | 10 / 10.2 / 10.3 mm as applicable |    M12 |          28 mm |
| Listed heavy `H4040F`, `H4545`, `H4545C`, `H4560`; 欧标 50 |                             12 mm |    M14 |          36 mm |

Published thread controls: position ±0.2 mm, metric 6H, axis-to-end-face perpendicularity ≤ 0.1°, and C0.5 entry chamfer.

## Counterbores and listed screws

| Family                              |                   Counterbore code | Through `d` | Counterbore `d1` | Depth `H` |
| ----------------------------------- | ---------------------------------: | ----------: | ---------------: | --------: |
| 欧标 2020D                          |                                 Z5 |      5.5 mm |           9.5 mm |    5.5 mm |
| 欧标 20 except 2020D; 国标 30       |                                 Z6 |      6.5 mm |            11 mm |    6.5 mm |
| 欧标 30; 欧标 40 槽 8; 国标 40 槽 8 |                                 Z8 |        9 mm |            14 mm |    8.5 mm |
| 欧标/国标 40, 45, 50 槽 10          | Z8 with the listed threaded sleeve |        9 mm |            14 mm |    8.5 mm |

JLCFA's listed screw examples:

| Example profile | Cylindrical-head screw | Button-head screw |
| --------------- | ---------------------- | ----------------- |
| 欧标 2020D / Z5 | M5 × 25                | M5 × 12           |
| 欧标 2020 / Z6  | M6 × 25                | M6 × 16           |
| 欧标 3030 / Z8  | M8 × 40                | M8 × 20           |
| 欧标 4040 / Z8  | M8 × 45                | M8 × 20           |
| 国标 3030 / Z6  | M6 × 35                | M6 × 16           |
| 国标 4040 / Z8  | M8 × 45                | M8 × 20           |

Published counterbore controls include H7 through-hole diameter and ±0.2 mm position and depth tolerances.

## Anchor-connector cross holes

`T` is the profile's groove-wall thickness in the JLCFA expression.

| Family        | End distance `G` | Hole `H` | Listed connector              |
| ------------- | ---------------- | -------: | ----------------------------- |
| 欧标 30       | `19 - T + 2`     | Φ11.5 mm | `TPEF-308-0`, `TPEG-308-90`   |
| 欧标 40 槽 8  | `19 - T + 2`     | Φ11.5 mm | `TPEF-308-0`, `TPEG-308-90`   |
| 欧标 40 槽 10 | `27 - T + 2`     |   Φ17 mm | `TPHC-4510-0`, `TPHD-4510-90` |
| 欧标 45       | `27 - T + 2`     |   Φ17 mm | `TPHC-4510-0`, `TPHD-4510-90` |

The official page specifies H7 hole diameter and ±0.2 mm position.

## Whistle-connector blind holes

| Family                               | End distance `G` | Hole `H` | Depth `D` |
| ------------------------------------ | ---------------: | -------: | --------: |
| 欧标 20                              |            13 mm | Φ12.5 mm |      9 mm |
| 欧标 30; 国标 30                     |            16 mm |   Φ15 mm |   12.5 mm |
| 欧标 40 槽 8; 国标 40; 欧标 40 槽 10 |            19 mm |   Φ19 mm |     18 mm |
| 欧标 45; 欧标 50                     |            19 mm |   Φ19 mm |     18 mm |

Published blind-hole controls include ±0.2 mm position and depth.

## Cutting

- General cut-length tolerance: ±0.3 mm for `L ≤ 1000 mm`; ±0.5 mm for `L > 1000 mm`.
- Standard miter: 45°.
- Listed nonstandard miter range: 30° to 150°; other or high-precision work requires CNC confirmation.
- Published miter controls: angle ±0.2°, mating gap ±0.3 mm, and length ±0.3 mm.

## Order data required for every operation

Record profile part code, left/right end, face orientation, operation code, dimensions, connector SKU, screw SKU, quantity, tolerance, drawing revision, and supplier confirmation. A family-level row is not enough to release a part.
