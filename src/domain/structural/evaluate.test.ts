import { describe, expect, it } from "vitest";

import { createParametricClearanceFrameDemo } from "../project/defaults";
import { evaluateStructuralSizing } from "./evaluate";

describe("beam structural sizing", () => {
  it("C-beam-superposition reproduces the default simply supported beam study", () => {
    const project = createParametricClearanceFrameDemo({
      projectId: "project.structural-sizing",
      now: "2026-08-11T00:00:00.000Z",
    });
    const result = evaluateStructuralSizing(project);

    expect(result).not.toBeNull();
    expect(result?.effectiveSpanMm).toBe(2190);
    expect(result?.maximumSectionHeightMm).toBe(80);
    expect(result?.distributedForcePerBeamN).toBeCloseTo(205.94, 1);
    expect(result?.centerPointForcePerBeamN).toBeCloseTo(147.1, 1);

    const light4080 = result?.candidates.find(
      (candidate) => candidate.candidate.sku === "NFSL8-4080",
    );
    expect(light4080?.deflectionPartsMm).toMatchObject({
      panel: expect.closeTo(0.217, 3),
      distributedPayload: expect.closeTo(0.544, 3),
      beamSelfWeight: expect.closeTo(0.168, 3),
      centerPointPayload: expect.closeTo(0.87, 3),
    });
    expect(light4080?.deflectionMm).toBeCloseTo(1.8, 2);
    expect(light4080?.deflectionLimitMm).toBeCloseTo(2.19, 2);
    expect(light4080?.bendingStressNPerMm2).toBeCloseTo(11.3, 1);
  });

  it("C-minimum-mass-passing-profile chooses the lightest passing vendor SKU", () => {
    const result = evaluateStructuralSizing(createParametricClearanceFrameDemo());
    const bySku = Object.fromEntries(
      result?.candidates.map((candidate) => [candidate.candidate.sku, candidate]) ?? [],
    );

    expect(result?.candidates.map(({ candidate }) => candidate.sku)).toEqual([
      "NEFS6-3030",
      "LCF8-3060",
      "NEFS8-4040",
      "LCF8-3090",
      "NFSL8-4080",
      "LCF8-30120",
      "NEFS8-4080",
    ]);

    expect(bySku["NEFS6-3030"].passesDeflection).toBe(false);
    expect(bySku["NEFS8-4040"].passesDeflection).toBe(false);
    expect(bySku["LCF8-3060"].passesDeflection).toBe(false);
    expect(bySku["LCF8-3090"]).toMatchObject({
      passesDeflection: true,
      fitsSectionHeight: false,
      fitsCompatibilityGroup: false,
      eligible: false,
    });
    expect(bySku["LCF8-30120"]).toMatchObject({
      passesDeflection: true,
      fitsSectionHeight: false,
      fitsCompatibilityGroup: false,
      eligible: false,
    });
    expect(bySku["NFSL8-4080"]).toMatchObject({
      passesDeflection: true,
      fitsSectionHeight: true,
      fitsCompatibilityGroup: true,
      eligible: true,
    });
    expect(bySku["NEFS8-4080"]).toMatchObject({
      passesDeflection: true,
      fitsSectionHeight: true,
      fitsCompatibilityGroup: true,
      eligible: true,
    });
    expect(result?.selected?.candidate.sku).toBe("NFSL8-4080");
    expect(result?.selected?.beamSetMassKg).toBeCloseTo(9.46, 2);
    expect(result?.selected?.centerPointMassLimitKgUnderBaseLoad).toBeCloseTo(21.75, 2);
  });

  it("does not cross-select an incompatible accessory system when the height envelope grows", () => {
    const project = createParametricClearanceFrameDemo();
    project.parameters.inputs.topBeamMaximumHeight.valueMm = 120;

    const result = evaluateStructuralSizing(project);

    expect(result?.candidates.find(({ candidate }) => candidate.sku === "LCF8-3090")).toMatchObject(
      {
        passesDeflection: true,
        fitsSectionHeight: true,
        fitsCompatibilityGroup: false,
        eligible: false,
      },
    );
    expect(result?.selected?.candidate.sku).toBe("NFSL8-4080");
  });
});
