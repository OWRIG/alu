import { describe, expect, it } from "vitest";

import { evaluateParameters } from "../params/evaluate";
import { createMobileOverbedDemo } from "./defaults";

describe("mobile overbed demo", () => {
  it("C-inset-tabletop-fit derives a flush panel inside the top frame", () => {
    const project = createMobileOverbedDemo({
      projectId: "project.inset-panel",
      now: "2026-08-09T00:00:00.000Z",
    });
    const values = evaluateParameters(project.parameters);

    expect(values).toMatchObject({
      innerClearWidth: 2150,
      frameOuterWidth: 2230,
      topFrameInnerWidth: 2150,
      topFrameInnerDepth: 420,
      tabletopWidth: 2146,
      tabletopDepth: 416,
      clearanceAboveMattress: 232,
      beamUndersideClearance: 170,
      uprightLength: 670,
      topBeamCenterZ: 710,
    });
    expect(project.extensions?.panelMount).toEqual({
      method: "shelf-support-flush-inset",
      panelTopFlushWithFrame: true,
      fitClearancePerSideMm: 2,
      supportConcept: "continuous-inner-ledges-or-shelf-supports",
      measurePanelAfterFrameAssembly: true,
    });
  });

  it("C-inset-top-frame-topology closes the panel with four top rails", () => {
    const project = createMobileOverbedDemo({
      projectId: "project.inset-frame",
      now: "2026-08-09T00:00:00.000Z",
    });

    expect(Object.keys(project.entities)).toHaveLength(10);
    expect(project.entities["profile.top-front"]).toMatchObject({
      origin: { y: 20, z: 710 },
      axis: "x",
      lengthMm: 2230,
    });
    expect(project.entities["profile.top-rear"]).toMatchObject({
      origin: { y: 480, z: 710 },
      axis: "x",
      lengthMm: 2230,
    });
    expect(project.entities["profile.top-side-left"]).toMatchObject({
      origin: { x: 20, y: 40, z: 710 },
      axis: "y",
      lengthMm: 420,
    });
    expect(project.entities["profile.top-side-right"]).toMatchObject({
      origin: { x: 2210, y: 40, z: 710 },
      axis: "y",
      lengthMm: 420,
    });
  });
});
