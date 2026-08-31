import { describe, expect, it } from "vitest";

import { loadOverbedFixture } from "../../test-support/fixture";
import { createParametricClearanceFrameDemo } from "../project/defaults";
import { canProceed, evaluateRules } from "./evaluate";

describe("P1 engineering rules", () => {
  it("matches the golden fixture rule set", () => {
    const ids = new Set(evaluateRules(loadOverbedFixture()).map((finding) => finding.ruleId));
    expect(ids).toEqual(
      new Set([
        "structure.long-span-review",
        "structure.mobile-side-sway",
        "caster.installed-height-required",
        "caster.wood-floor-soft-tread",
      ]),
    );
    expect(ids.has("connection.main-node-strength")).toBe(false);
    expect(ids.has("caster.brake-accessibility")).toBe(false);
    // Removed in 2026-08-30-context-and-rule-scope: it fired off a free-text regex.
    expect(ids.has("motion.cable-routing-safe")).toBe(false);
  });

  it("never emits a certified load or safety claim", () => {
    const messages = evaluateRules(loadOverbedFixture())
      .map((finding) => `${finding.message} ${finding.rationale}`)
      .join(" ");
    expect(messages).not.toMatch(/额定承载\s*[:：]?\s*\d|结构安全|结构合格/);
  });

  it("replaces the generic long-span prompt with a calculated sizing screen", () => {
    const findings = evaluateRules(createParametricClearanceFrameDemo());
    expect(findings.some((finding) => finding.ruleId === "structure.beam-sizing-screen")).toBe(
      true,
    );
    expect(findings.some((finding) => finding.ruleId === "structure.long-span-review")).toBe(false);
  });

  it("C-caster-height-required blocks ordering until the installed height is explicit", () => {
    const project = createParametricClearanceFrameDemo();
    project.parameters.inputs.casterInstalledHeight.valueMm = 0;
    const finding = evaluateRules(project).find(
      (item) => item.ruleId === "caster.installed-height-required",
    );
    expect(finding).toMatchObject({
      severity: "error",
      blocks: ["order-draft", "order-ready"],
    });

    project.parameters.inputs.casterInstalledHeight.valueMm = 100;
    expect(
      evaluateRules(project).some((item) => item.ruleId === "caster.installed-height-required"),
    ).toBe(false);
  });

  it("C-not-for-ordering blocks order-ready but keeps draft handoff available", () => {
    const findings = evaluateRules(createParametricClearanceFrameDemo());
    const finding = findings.find((item) => item.ruleId === "project.order-data-incomplete");

    expect(finding).toMatchObject({
      severity: "warning",
      blocks: ["order-ready"],
    });
    expect(canProceed(findings, "order-draft")).toBe(true);
    expect(canProceed(findings, "order-ready")).toBe(false);
  });

  it("C-section-parameter-consistency detects a physical-section mismatch", () => {
    const project = createParametricClearanceFrameDemo();
    project.parameters.inputs.topFrameHeight.valueMm = 60;
    const findings = evaluateRules(project).filter(
      (item) => item.ruleId === "structure.section-parameter-mismatch",
    );
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      severity: "error",
      blocks: ["order-draft", "order-ready"],
    });
  });

  it("C-rule-role-not-in-purpose-copy does not infer structure from a label", () => {
    const project = loadOverbedFixture();
    const before = evaluateRules(project).map((finding) => finding.ruleId);
    project.entities["profile.top-front"].purpose = "brace main-span 主梁 横撑";
    const after = evaluateRules(project).map((finding) => finding.ruleId);
    expect(after).toEqual(before);
  });
});
