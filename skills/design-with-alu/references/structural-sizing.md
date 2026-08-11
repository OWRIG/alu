# Structural sizing in ALU

Read this reference when a project contains `extensions.structuralSizing` or the user asks which beam profile is appropriate.

## Required inspection

1. Read `effectiveSpanParam` and resolve it from the project dimension chain. Do not substitute member cut length.
2. Read `maximumSectionHeightParam` and `requiredCompatibilityGroup`; treat them as hard geometry and interface-family filters for the current study.
3. Report all load inputs in kg and both per-beam shares. Distinguish panel dead load, distributed payload, concentrated payload, and candidate self-weight.
4. For every candidate, report exact SKU, vertical orientation, mass per meter, inertia, interface family, catalog source, calculated deflection, section-height fit, compatibility fit, and eligibility.
5. Confirm that selection filters for deflection, height, and interface family first, then minimizes mass per meter. Do not silently remove failed or constrained candidates from the handoff.
6. Read `constructionEvidence` separately. Use it to explain load-path and assembly decisions, never to assign numeric capacity.

## Current formulas

```text
δudl   = 5wL⁴ / (384EI)
δpoint = PL³ / (48EI)
Mmax   = wL² / 8 + PL / 4
Z      = I / (h/2) for the stored symmetric sections
σ      = Mmax / Z
```

The result superposes component deflections. Candidate self-weight changes `w`, so recompute it for every SKU.

## Interpretation boundary

- `passesDeflection` means calculated ideal-beam deflection is no greater than the stored criterion.
- `fitsSectionHeight` means the candidate does not exceed the current height constraint.
- `fitsCompatibilityGroup` means the candidate belongs to the interface family required by the current frame.
- `eligible` requires all three.
- `selected` is the lowest-mass eligible candidate in the embedded set, not a universal optimum.
- `centerPointMassLimitKgUnderBaseLoad` is inverted from the deflection limit with current uniform loads. Never call it rated capacity.
- `bendingStressNPerMm2` is reported, not approved; the current study has no allowable stress or safety-factor verdict.

Interface-family equality is only a first filter; it does not prove that a specific connector SKU fits every node. Always retain exact connectors, joint flexibility, local failure, panel composite action, sway, tipping, casters, impact, fatigue, current-catalog verification, and physical proof testing as unresolved unless separate evidence explicitly covers them.
