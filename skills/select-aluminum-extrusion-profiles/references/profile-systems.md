# Profile systems and exact-SKU selection

Checked 2026-08-11. Use this as a decision aid, not as a frozen catalog. Reopen the linked vendor page before procurement.

## The compatibility key

`2020`, `3030`, and `4040` describe outer dimensions, not a complete interface. Identify a profile with all of these fields:

| Field                             | Why it matters                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Vendor and product line           | Similar marketing names do not guarantee interchangeable geometry.                        |
| Modular base and outer section    | Establishes member envelope and nominal family.                                           |
| Groove opening and undercut       | Controls nuts, internal joints, gaskets, and panel insertion.                             |
| Center bore and supported end tap | Controls end joints, feet, and some caster interfaces.                                    |
| Exact cross-section variant       | Light, standard, heavy, closed-face, and radius variants have different mass and inertia. |
| Orientation                       | Selects the vertical dimension and the matching `I` and `Z`.                              |
| Finish and exposed faces          | Affects appearance, wear, grounding, and whether a hidden groove can be opened.           |
| Source URL and revision date      | Makes the definition auditable and refreshable.                                           |

“欧标” and “国标” are catalog family labels in the sources below. Do not treat the label itself as proof of an EN, DIN, or GB interface standard.

## Current practical family map

嘉立创 FA's current catalog is useful evidence that nominal size alone is ambiguous:

| Catalog family | Published groove opening | Published edge family                                                            |
| -------------- | -----------------------: | -------------------------------------------------------------------------------- |
| 欧标 20        |                   6.2 mm | 20 / 40 / 60 / 80 mm                                                             |
| 欧标 30        |                   8.2 mm | 30 / 45 / 50 / 60 / 90 / 120 / 150 mm                                            |
| 欧标 40 槽 8   |                   8.2 mm | 40 / 80 / 120 / 160 mm                                                           |
| 欧标 40 槽 10  |                  10.2 mm | 40 / 60 / 80 mm in the family title; inspect the selected SKU for other sections |
| 欧标 45        |                  10.2 mm | 45 / 90 mm                                                                       |
| 国标 30        |                   6.3 mm | 30 / 60 mm                                                                       |
| 国标 40        |                   8.3 mm | 40 / 80 mm                                                                       |

The catalog also exposes 15, 50, 60, specialty, and general-purpose families. This table narrows a search; it does not establish cross-vendor interchangeability.

MISUMI's May 2026 guide gives a stronger ambiguity example: `HFS5-4040` and `HFS8-4040` are both 40 × 40 mm, but use different modular bases, slot arrangements, hardware, mass, and moments of inertia. Record the SKU, not “4040.”

## Shape and section variant

- Start with a square section when connection flexibility dominates.
- Use a rectangular section such as 2040, 3060, or 4080 when one bending direction governs. Put the larger section dimension in the bending plane and verify the corresponding catalog inertia.
- Use multi-slot rectangulars only when the extra slot rows are useful; more slots can complicate brackets and panel interfaces.
- Use closed-face, radius, handle, door, or other specialty sections only for a named geometry or finish requirement.
- Treat light, standard, and high-rigidity cross-sections as separate candidates even when their outer dimensions match.

## Calculation protocol

Use consistent `N` and `mm` units. Obtain `E`, `I`, mass, yield or allowable stress, and section modulus from the exact supplier definition.

Common ideal-beam screens include:

```text
Simply supported, center point load: δ = P L³ / (48 E I)
Simply supported, uniform load:      δ = 5 w L⁴ / (384 E I)
Cantilever, end point load:          δ = P L³ / (3 E I)
Simply supported maximum moment:     M = P L / 4 + w L² / 8
Symmetric-section bending stress:    σ = M / Z
```

Superpose compatible linear-elastic load cases. Add each candidate's own self-weight to `w`. Do not reuse a formula for a different support condition.

MISUMI publishes some “allowable load” values at deflection `L/1000` for a simply supported central load. That is the stated basis of that table, not a universal furniture criterion and not proof of connector or frame capacity. 80/20 and item provide part-number deflection calculators that similarly require the profile, orientation, support, length, and load.

## Candidate record

```text
vendor / region / source date
exact SKU and catalog revision
family key and groove opening
outer width × vertical height
mass per metre
Ix / Iy and selected I
Z or derivation boundary
material and E source
effective span and support condition
distributed / point / dynamic loads and load shares
self-weight contribution
deflection / stress result and criterion
geometry / interface / machining eligibility
connector and stability checks still open
```

## Selection boundary

Labels such as 2020, 3030, and 4040 are search terms, not engineering selections. Without an exact SKU, span, support condition, section properties, load distribution, deflection target, and node data, keep the result at concept level.

## Sources

- [嘉立创 FA 铝型材目录](https://www.jlcfa.com/catalog/T/T01), checked 2026-08-11.
- [MISUMI: Aluminum Extrusion Profiles — Shapes, Types, Series, & Best Practices](https://us.misumi-ec.com/blog/aluminum-extrusion-profiles-shapes-types-series-best-practices/), published 2026-05-19.
- [MISUMI extrusion load-capacity calculations](https://us.misumi-ec.com/pdf/fa/2010/p2431.pdf), current official calculation sheet found 2026-08-11.
- [80/20 beam deflection calculator](https://8020.net/deflection-calculator), current official calculator checked 2026-08-11.
