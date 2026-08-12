import { createParametricClearanceFrameDemo } from "../project/defaults";
import { describe, expect, it } from "vitest";
import {
  buildProjectHandoff,
  renderProjectHandoffHtml,
  renderProjectHandoffMarkdown,
} from "./handoff";

describe("project handoff", () => {
  it("uses one report model for Markdown and branded PDF HTML", () => {
    const project = createParametricClearanceFrameDemo({
      projectId: "project.handoff",
      now: "2026-08-12T00:00:00.000Z",
    });
    const report = buildProjectHandoff(project, "order-draft");
    const markdown = renderProjectHandoffMarkdown(report);
    const html = renderProjectHandoffHtml(report, {
      logoDataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
    });

    expect(report.reportVersion).toBe(1);
    expect(report.project.id).toBe("project.handoff");
    expect(report.materials.length).toBeGreaterThan(0);
    expect(markdown).toContain("# ALU · 工程交付单");
    expect(markdown).toContain(report.project.designHash);
    expect(markdown).toContain(report.bomHash);
    expect(markdown).toContain("当前材料清单只包含型材切料");
    expect(html).toContain("data:image/svg+xml;base64,PHN2Zy8+");
    expect(html).toContain(report.project.designHash);
    expect(html).toContain(report.bomHash);
    expect(html).toContain("当前材料清单只包含型材切料");
  });
});
