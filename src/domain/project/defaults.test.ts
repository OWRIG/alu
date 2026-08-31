import { describe, expect, it } from "vitest";

import { evaluateParameters } from "../params/evaluate";
import { createParametricClearanceFrameDemo } from "./defaults";

describe("parametric clearance-frame demo", () => {
  it("C-inset-tabletop-fit derives a flush panel inside the top frame", () => {
    const project = createParametricClearanceFrameDemo({
      projectId: "project.inset-panel",
      now: "2026-08-09T00:00:00.000Z",
    });
    const values = evaluateParameters(project.parameters);

    expect(project.meta.name).toBe("Parametric Clearance Frame");
    expect(project.context.usage).toEqual(["clearance-frame"]);
    expect(project.parameters.inputs).toHaveProperty("obstacleOuterWidth");
    expect(project.parameters.inputs).toHaveProperty("obstacleTopHeight");
    expect(project.parameters.inputs).not.toHaveProperty("bedOuterWidth");
    expect(project.parameters.derived).toHaveProperty("clearanceAboveObstacle");
    expect(values).toMatchObject({
      innerClearWidth: 2140,
      frameOuterWidth: 2200,
      topFrameInnerWidth: 2140,
      topFrameInnerDepth: 400,
      tabletopWidth: 2130,
      tabletopDepth: 390,
      clearanceAboveObstacle: 315,
      beamUndersideClearance: 243,
      uprightLength: 600,
      uprightStartZ: 143,
      topBeamCenterZ: 788,
      topBeamEffectiveSpan: 2170,
      topSideRailCenterZ: 818,
      frontUprightCenterY: 15,
      rearUprightCenterY: 445,
      baseRailStartY: -70,
      baseRailCenterZ: 128,
    });
    expect(project.extensions?.panelMount).toEqual({
      method: "shelf-support-flush-inset",
      panelTopFlushWithFrame: true,
      fitClearancePerSideMm: 5,
      supportConcept: "continuous-inner-ledges-or-shelf-supports",
      measurePanelAfterFrameAssembly: true,
    });
    expect(project.extensions?.designTarget).toMatchObject({
      requestedFinishedHeightMm: 850,
      acceptedToleranceMm: 30,
      modeledFinishedHeightMm: 833,
      preferredCutIncrementMm: 100,
    });
    expect(project.extensions?.structuralSizing).toMatchObject({
      version: 1,
      effectiveSpanParam: "topBeamEffectiveSpan",
      maximumSectionHeightParam: "topBeamMaximumHeight",
      requiredCompatibilityGroup: "jlcfa-euro-30-slot-8",
      loads: {
        panelMassKg: 12,
        distributedPayloadKg: 15,
        centerPointPayloadKg: 10,
      },
    });
    expect(project.extensions?.casterMount).toMatchObject({
      sku: "GD-80-S-HUP",
      quantity: 4,
      publishedCasterHeightMm: 103,
      modeledAdapterStackAllowanceMm: 10,
      modeledInstalledHeightMm: 113,
      adapterPlateSku: "TPED-308-3060-M12",
      verifyInstalledStackBeforeCutting: true,
    });
  });

  it("C-inset-top-frame-topology closes the panel with four top rails", () => {
    const project = createParametricClearanceFrameDemo({
      projectId: "project.inset-frame",
      now: "2026-08-09T00:00:00.000Z",
    });

    expect(Object.keys(project.entities)).toHaveLength(10);
    expect(project.entities["profile.top-front"]).toMatchObject({
      origin: { y: 15, z: 788 },
      axis: "x",
      lengthMm: 2200,
    });
    expect(project.entities["profile.top-rear"]).toMatchObject({
      origin: { y: 445, z: 788 },
      axis: "x",
      lengthMm: 2200,
    });
    expect(project.entities["profile.top-side-left"]).toMatchObject({
      origin: { x: 15, y: 30, z: 818 },
      axis: "y",
      lengthMm: 400,
    });
    expect(project.entities["profile.top-side-right"]).toMatchObject({
      origin: { x: 2185, y: 30, z: 818 },
      axis: "y",
      lengthMm: 400,
    });
    expect(project.entities["profile.top-front"].definitionRef.partId).toBe(
      "generic.profile.3090-envelope",
    );
    expect(project.entities["profile.top-side-left"].definitionRef.partId).toBe(
      "jlcfa.txck-h6-j3030",
    );
    expect(project.entities["profile.upright-left-front"]).toMatchObject({
      origin: { x: 15, y: 15, z: 143 },
      lengthMm: 600,
    });
    expect(project.entities["profile.base-left"]).toMatchObject({
      definitionRef: { partId: "jlcfa.txck-h6-j3060" },
      origin: { x: 15, y: -70, z: 128 },
      lengthMm: 600,
      rotationAroundAxisDeg: 90,
    });
  });
});
