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
    expect(result?.effectiveSpanMm).toBe(2170);
    expect(result?.maximumSectionHeightMm).toBe(90);
    expect(result?.distributedForcePerBeamN).toBeCloseTo(132.39, 1);
    expect(result?.centerPointForcePerBeamN).toBeCloseTo(98.07, 1);

    const light3090 = result?.candidates.find(
      (candidate) => candidate.candidate.sku === "TXCK-H6-J3090",
    );
    expect(light3090?.deflectionPartsMm).toMatchObject({
      panel: expect.closeTo(0.201, 3),
      distributedPayload: expect.closeTo(0.251, 3),
      beamSelfWeight: expect.closeTo(0.143, 3),
      centerPointPayload: expect.closeTo(0.536, 3),
    });
    expect(light3090?.deflectionMm).toBeCloseTo(1.131, 3);
    expect(light3090?.deflectionLimitMm).toBeCloseTo(2.17, 2);
    expect(light3090?.bendingStressNPerMm2).toBeCloseTo(8.12, 2);
  });

  it("C-minimum-mass-passing-profile chooses the lightest passing vendor SKU", () => {
    const result = evaluateStructuralSizing(createParametricClearanceFrameDemo());
    const bySku = Object.fromEntries(
      result?.candidates.map((candidate) => [candidate.candidate.sku, candidate]) ?? [],
    );

    expect(result?.candidates.map(({ candidate }) => candidate.sku)).toEqual([
      "TXCK-H6-J3030",
      "NEFS6-3030",
      "TXCK-H6-J3060",
      "LCF8-3060",
      "NEFS8-4040",
      "TXCK-H6-J3090",
      "LCF8-3090",
      "NFSL8-4080",
      "TXCK-H6-3090",
      "LCF8-30120",
      "NEFS8-4080",
    ]);

    expect(bySku["TXCK-H6-J3030"].passesDeflection).toBe(false);
    expect(bySku["TXCK-H6-J3060"].passesDeflection).toBe(false);
    expect(bySku["NEFS6-3030"].passesDeflection).toBe(false);
    expect(bySku["NEFS8-4040"].passesDeflection).toBe(false);
    expect(bySku["LCF8-3060"].passesDeflection).toBe(false);
    expect(bySku["LCF8-3090"]).toMatchObject({
      passesDeflection: true,
      fitsSectionHeight: true,
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
      fitsCompatibilityGroup: false,
      eligible: false,
    });
    expect(bySku["TXCK-H6-J3090"]).toMatchObject({
      passesDeflection: true,
      fitsSectionHeight: true,
      fitsCompatibilityGroup: true,
      eligible: true,
    });
    expect(bySku["TXCK-H6-3090"]).toMatchObject({
      passesDeflection: true,
      fitsSectionHeight: true,
      fitsCompatibilityGroup: true,
      eligible: true,
    });
    expect(result?.selected?.candidate.sku).toBe("TXCK-H6-J3090");
    expect(result?.selected?.beamSetMassKg).toBeCloseTo(8.67, 2);
    expect(result?.selected?.centerPointMassLimitKgUnderBaseLoad).toBeCloseTo(29.4, 2);
  });

  it("does not cross-select an incompatible accessory system", () => {
    const project = createParametricClearanceFrameDemo();

    const result = evaluateStructuralSizing(project);

    expect(result?.candidates.find(({ candidate }) => candidate.sku === "LCF8-3090")).toMatchObject(
      {
        passesDeflection: true,
        fitsSectionHeight: true,
        fitsCompatibilityGroup: false,
        eligible: false,
      },
    );
    expect(result?.selected?.candidate.sku).toBe("TXCK-H6-J3090");
  });
});
