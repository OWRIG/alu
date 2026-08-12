import { deriveProfileBom } from "../bom/derive";
import { evaluateParameters } from "../params/evaluate";
import { projectIdentity } from "../commands/preview";
import { partKey } from "../project/parse";
import type { ProjectDocumentV1 } from "../project/schema";
import {
  canProceed,
  evaluateRules,
  type RuleFinding,
  type ValidationTarget,
} from "../rules/evaluate";
import { evaluateStructuralSizing } from "../structural/evaluate";

export type HandoffParameter = {
  id: string;
  label: string;
  kind: "input" | "derived";
  valueMm: number;
};

export type HandoffMaterial = {
  definitionName: string;
  vendor: string | null;
  sku: string | null;
  lengthMm: number;
  quantity: number;
  totalLengthMm: number;
  rotationDeg: number;
  purpose: string;
};

export type HandoffSizing = {
  effectiveSpanMm: number;
  maximumSectionHeightMm: number;
  panelMassKg: number;
  distributedPayloadKg: number;
  centerPointPayloadKg: number;
  selectedSku: string | null;
  deflectionMm: number | null;
  deflectionLimitMm: number | null;
};

export type ProjectHandoff = {
  reportVersion: 1;
  brand: "ALU";
  project: {
    id: string;
    name: string;
    revision: number;
    designHash: string;
    updatedAt: string;
    units: "mm";
  };
  validation: {
    target: ValidationTarget;
    canProceed: boolean;
    errors: number;
    warnings: number;
    infos: number;
  };
  parameters: HandoffParameter[];
  materials: HandoffMaterial[];
  bomHash: string;
  sizing: HandoffSizing | null;
  findings: RuleFinding[];
  boundaries: string[];
};

export const HANDOFF_BOUNDARIES = [
  "当前材料清单只包含型材切料，不包含连接件、加工、紧固件、脚轮、板材和附件。",
  "梁结果只覆盖理想简支挠度筛选，不是整机额定载荷、完整结构分析或安全认证。",
  "采购前仍需核对厂家最新图纸、SKU revision、连接方式，并实测组装后的关键尺寸。",
] as const;

export function buildProjectHandoff(
  project: ProjectDocumentV1,
  target: ValidationTarget,
): ProjectHandoff {
  const identity = projectIdentity(project);
  const evaluated = evaluateParameters(project.parameters);
  const parameters: HandoffParameter[] = [
    ...Object.entries(project.parameters.inputs).map(([id, parameter]) => ({
      id,
      label: parameter.label ?? id,
      kind: "input" as const,
      valueMm: evaluated[id],
    })),
    ...Object.entries(project.parameters.derived).map(([id, parameter]) => ({
      id,
      label: parameter.label ?? id,
      kind: "derived" as const,
      valueMm: evaluated[id],
    })),
  ].sort((left, right) => left.id.localeCompare(right.id, "en"));

  const bom = deriveProfileBom(project);
  const materials = bom.lines.map((line) => {
    const definition =
      project.embeddedParts[partKey(line.definitionRef.partId, line.definitionRef.revision)]
        ?.definition;
    return {
      definitionName: line.definitionName,
      vendor: definition?.procurement?.vendor ?? null,
      sku: definition?.procurement?.sku ?? null,
      lengthMm: line.lengthMm,
      quantity: line.quantity,
      totalLengthMm: line.lengthMm * line.quantity,
      rotationDeg: line.rotationAroundAxisDeg,
      purpose: line.purpose,
    };
  });

  const structural = evaluateStructuralSizing(project);
  const findings = evaluateRules(project);
  const sizing: HandoffSizing | null = structural
    ? {
        effectiveSpanMm: structural.effectiveSpanMm,
        maximumSectionHeightMm: structural.maximumSectionHeightMm,
        panelMassKg: structural.study.loads.panelMassKg,
        distributedPayloadKg: structural.study.loads.distributedPayloadKg,
        centerPointPayloadKg: structural.study.loads.centerPointPayloadKg,
        selectedSku: structural.selected?.candidate.sku ?? null,
        deflectionMm: structural.selected?.deflectionMm ?? null,
        deflectionLimitMm: structural.selected?.deflectionLimitMm ?? null,
      }
    : null;

  return {
    reportVersion: 1,
    brand: "ALU",
    project: {
      id: project.projectId,
      name: project.meta.name,
      revision: project.revision,
      designHash: identity.designHash,
      updatedAt: project.meta.updatedAt,
      units: project.meta.units,
    },
    validation: {
      target,
      canProceed: canProceed(findings, target),
      errors: findings.filter((finding) => finding.severity === "error").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      infos: findings.filter((finding) => finding.severity === "info").length,
    },
    parameters,
    materials,
    bomHash: bom.bomHash,
    sizing,
    findings,
    boundaries: [...HANDOFF_BOUNDARIES],
  };
}

function markdown(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ").trim();
}

function number(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits }).format(value);
}

function statusText(report: ProjectHandoff): string {
  return report.validation.canProceed ? "可继续" : "有阻断项";
}

export function renderProjectHandoffMarkdown(report: ProjectHandoff): string {
  const lines = [
    "# ALU · 工程交付单",
    "",
    `> ${markdown(report.project.name)} · revision ${report.project.revision} · ${statusText(report)}`,
    "",
    "## 工程",
    "",
    "| 项目 | 内容 |",
    "| --- | --- |",
    `| 工程 ID | \`${markdown(report.project.id)}\` |`,
    `| Design hash | \`${report.project.designHash}\` |`,
    `| 更新时间 | ${markdown(report.project.updatedAt)} |`,
    `| 校验目标 | \`${report.validation.target}\` |`,
    `| 校验结果 | ${statusText(report)} · ${report.validation.errors} error / ${report.validation.warnings} warning / ${report.validation.infos} info |`,
    "",
    "## 尺寸链",
    "",
    "| 类型 | 参数 | 名称 | 值 |",
    "| --- | --- | --- | ---: |",
    ...report.parameters.map(
      (parameter) =>
        `| ${parameter.kind === "input" ? "实测" : "派生"} | \`${markdown(parameter.id)}\` | ${markdown(parameter.label)} | ${number(parameter.valueMm)} mm |`,
    ),
    "",
    "## 型材材料与切料",
    "",
    "| 型材 / SKU | 切长 | 数量 | 总长 | 方向 | 用途 |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...report.materials.map((material) => {
      const identity = material.sku
        ? [material.vendor, material.sku].filter(Boolean).join(" · ")
        : `${material.definitionName} · SKU 待确认`;
      return `| ${markdown(identity)} | ${number(material.lengthMm)} mm | ${material.quantity} | ${number(material.totalLengthMm)} mm | ${material.rotationDeg}° | ${markdown(material.purpose)} |`;
    }),
    "",
    `BOM hash：\`${report.bomHash}\``,
    "",
  ];

  if (report.sizing) {
    lines.push(
      "## 梁选型摘要",
      "",
      "| 项目 | 数值 |",
      "| --- | ---: |",
      `| 有效跨度 | ${number(report.sizing.effectiveSpanMm)} mm |`,
      `| 最大截面高度 | ${number(report.sizing.maximumSectionHeightMm)} mm |`,
      `| 台面质量 | ${number(report.sizing.panelMassKg)} kg |`,
      `| 均布载荷 | ${number(report.sizing.distributedPayloadKg)} kg |`,
      `| 中点载荷 | ${number(report.sizing.centerPointPayloadKg)} kg |`,
      `| 当前入选 SKU | ${markdown(report.sizing.selectedSku ?? "无合格候选")} |`,
      `| 计算挠度 / 限值 | ${report.sizing.deflectionMm === null ? "—" : `${number(report.sizing.deflectionMm)} / ${number(report.sizing.deflectionLimitMm ?? 0)} mm`} |`,
      "",
    );
  }

  lines.push(
    "## 未解决检查",
    "",
    ...(report.findings.length === 0
      ? ["当前没有检查项。"]
      : report.findings.map((finding) => {
          const action = finding.suggestedActions?.[0];
          return `- **${finding.severity.toUpperCase()} · \`${markdown(finding.ruleId)}\`** ${markdown(finding.message)}${action ? ` 下一步：${markdown(action)}。` : ""}`;
        })),
    "",
    "## 边界",
    "",
    ...report.boundaries.map((boundary) => `- ${markdown(boundary)}`),
    "",
    "---",
    "",
    "由 ALU 生成 · 面向 Agent 的工业铝型材设计工作台",
    "",
  );

  return lines.join("\n");
}

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function table(headers: string[], rows: string[][]): string {
  return `<table><thead><tr>${headers.map((header) => `<th>${html(header)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function renderProjectHandoffHtml(
  report: ProjectHandoff,
  options: { logoDataUrl: string },
): string {
  const parameterRows = report.parameters.map((parameter) => [
    html(parameter.kind === "input" ? "实测" : "派生"),
    `<code>${html(parameter.id)}</code>`,
    html(parameter.label),
    `<span class="numeric">${number(parameter.valueMm)} mm</span>`,
  ]);
  const materialRows = report.materials.map((material) => {
    const identity = material.sku
      ? [material.vendor, material.sku].filter(Boolean).join(" · ")
      : `${material.definitionName} · SKU 待确认`;
    return [
      html(identity),
      `<span class="numeric">${number(material.lengthMm)} mm</span>`,
      `<span class="numeric">${material.quantity}</span>`,
      `<span class="numeric">${number(material.totalLengthMm)} mm</span>`,
      html(material.purpose),
    ];
  });
  const findingItems = report.findings.length
    ? report.findings
        .map(
          (finding) =>
            `<li><span class="severity severity--${finding.severity}">${html(finding.severity)}</span><div><strong>${html(finding.message)}</strong><small><code>${html(finding.ruleId)}</code>${finding.suggestedActions?.[0] ? ` · 下一步：${html(finding.suggestedActions[0])}` : ""}</small></div></li>`,
        )
        .join("")
    : "<li><div><strong>当前没有检查项。</strong></div></li>";

  const sizingSection = report.sizing
    ? `<section><h2>梁选型摘要</h2><div class="metrics">
        <div><small>有效跨度</small><strong>${number(report.sizing.effectiveSpanMm)} mm</strong></div>
        <div><small>载荷</small><strong>${number(report.sizing.panelMassKg + report.sizing.distributedPayloadKg)} + ${number(report.sizing.centerPointPayloadKg)} kg</strong></div>
        <div><small>当前入选</small><strong>${html(report.sizing.selectedSku ?? "无合格候选")}</strong></div>
        <div><small>挠度 / 限值</small><strong>${report.sizing.deflectionMm === null ? "—" : `${number(report.sizing.deflectionMm)} / ${number(report.sizing.deflectionLimitMm ?? 0)} mm`}</strong></div>
      </div></section>`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${html(report.project.name)} · ALU 工程交付单</title>
  <style>
    @page { size: A4; margin: 14mm 13mm 17mm; }
    * { box-sizing: border-box; }
    html { color: #18222d; font: 10.5px/1.5 -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", sans-serif; }
    body { margin: 0; background: #fff; }
    header { display: flex; align-items: center; gap: 12px; padding: 15px 17px; color: #fff; background: #101922; border-radius: 10px; }
    header img { width: 42px; height: 42px; border-radius: 9px; }
    header h1 { margin: 0; font-size: 20px; letter-spacing: .02em; }
    header p { margin: 2px 0 0; color: #b8c7d3; }
    .status { margin-left: auto; padding: 5px 9px; color: ${report.validation.canProceed ? "#bceccf" : "#ffd0c7"}; background: ${report.validation.canProceed ? "#173d2a" : "#4a221c"}; border-radius: 999px; font-weight: 700; }
    .identity { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 13px 2px 0; padding: 0; }
    .identity div { min-width: 0; }
    small { display: block; color: #687886; font-size: 8.5px; }
    .identity strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    section { break-inside: avoid; margin-top: 17px; }
    h2 { margin: 0 0 7px; color: #101922; font-size: 13px; }
    h2::before { content: ""; display: inline-block; width: 3px; height: 12px; margin-right: 7px; vertical-align: -1px; background: #1688e8; border-radius: 2px; }
    table { width: 100%; border-collapse: collapse; table-layout: auto; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th { padding: 6px 7px; color: #50616f; background: #edf3f7; border-bottom: 1px solid #cbd8e1; font-size: 8.5px; text-align: left; }
    td { padding: 6px 7px; border-bottom: 1px solid #e2e9ee; vertical-align: top; }
    td:nth-child(n+2) { white-space: nowrap; }
    td:last-child { white-space: normal; }
    code { font: 8.5px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; color: #355267; }
    .numeric { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
    .metrics div { padding: 9px; background: #f4f7f9; border: 1px solid #e0e8ed; border-radius: 7px; }
    .metrics strong { display: block; margin-top: 3px; color: #101922; font-size: 10px; }
    .findings { margin: 0; padding: 0; list-style: none; }
    .findings li { display: flex; gap: 8px; padding: 7px 0; border-bottom: 1px solid #e2e9ee; break-inside: avoid; }
    .findings strong { font-weight: 600; }
    .findings small { margin-top: 2px; }
    .severity { flex: 0 0 auto; align-self: flex-start; width: 44px; padding: 2px 4px; border-radius: 4px; font-size: 7.5px; font-weight: 800; text-align: center; text-transform: uppercase; }
    .severity--error { color: #8c2517; background: #fde4df; }
    .severity--warning { color: #79510a; background: #fff0c7; }
    .severity--info { color: #165d8e; background: #dfeffc; }
    .boundaries { margin: 0; padding-left: 17px; color: #50616f; }
    .boundaries li { margin: 4px 0; }
  </style>
</head>
<body>
  <header>
    <img src="${html(options.logoDataUrl)}" alt="ALU" />
    <div><h1>ALU · 工程交付单</h1><p>${html(report.project.name)}</p></div>
    <span class="status">${statusText(report)}</span>
  </header>
  <div class="identity">
    <div><small>工程 ID</small><strong>${html(report.project.id)}</strong></div>
    <div><small>Revision / 校验目标</small><strong>${report.project.revision} / ${html(report.validation.target)}</strong></div>
    <div><small>Design hash</small><strong><code>${html(report.project.designHash)}</code></strong></div>
    <div><small>检查</small><strong>${report.validation.errors} error · ${report.validation.warnings} warning · ${report.validation.infos} info</strong></div>
  </div>
  <section><h2>尺寸链</h2>${table(["类型", "参数", "名称", "值"], parameterRows)}</section>
  <section><h2>型材材料与切料</h2>${table(["型材 / SKU", "切长", "数量", "总长", "用途"], materialRows)}<small style="margin-top:6px">BOM hash · <code>${html(report.bomHash)}</code></small></section>
  ${sizingSection}
  <section><h2>未解决检查</h2><ul class="findings">${findingItems}</ul></section>
  <section><h2>边界</h2><ul class="boundaries">${report.boundaries.map((boundary) => `<li>${html(boundary)}</li>`).join("")}</ul></section>
</body>
</html>`;
}
