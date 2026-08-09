import { describe, expect, it } from "vitest";

import { loadOverbedFixture } from "../../test-support/fixture";
import { evaluateRules } from "./evaluate";

describe("P1 engineering rules", () => {
  it("matches the golden fixture rule set", () => {
    const ids = new Set(evaluateRules(loadOverbedFixture()).map((finding) => finding.ruleId));
    expect(ids).toEqual(
      new Set([
        "structure.long-span-review",
        "structure.mobile-side-sway",
        "caster.wood-floor-soft-tread",
        "motion.cable-routing-safe",
      ]),
    );
    expect(ids.has("connection.main-node-strength")).toBe(false);
    expect(ids.has("caster.brake-accessibility")).toBe(false);
  });

  it("never emits a certified load or safety claim", () => {
    const messages = evaluateRules(loadOverbedFixture())
      .map((finding) => `${finding.message} ${finding.rationale}`)
      .join(" ");
    expect(messages).not.toMatch(/额定承载\s*[:：]?\s*\d|结构安全|结构合格/);
  });
});
