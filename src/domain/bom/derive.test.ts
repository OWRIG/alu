import { describe, expect, it } from "vitest";

import { loadOverbedFixture } from "../../test-support/fixture";
import { deriveProfileBom } from "./derive";

describe("profile BOM", () => {
  it("C-profile-bom-aggregation groups identical profiles", () => {
    const bom = deriveProfileBom(loadOverbedFixture());
    expect(bom.lines).toHaveLength(1);
    expect(bom.lines[0]).toMatchObject({
      lengthMm: 2230,
      quantity: 2,
      purpose: "top-main-span",
      sourceEntityIds: ["profile.top-front", "profile.top-rear"],
    });
  });

  it("C-bom-recompute-stable returns the same lines and bomHash", () => {
    const project = loadOverbedFixture();
    expect(deriveProfileBom(project)).toEqual(deriveProfileBom(project));
  });
});
