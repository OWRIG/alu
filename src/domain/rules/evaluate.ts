import { evaluateParameters } from "../params/evaluate";
import { compareCanonicalText } from "../project/canonical";
import { DomainError } from "../project/error";
import { getBoundField, partKey } from "../project/parse";
import type { ProfileInstance, ProjectDocumentV1 } from "../project/schema";
import { evaluateStructuralSizing } from "../structural/evaluate";

export type ValidationTarget = "edit" | "order-draft" | "order-ready";
export type RuleSeverity = "error" | "warning" | "info";

export type RuleFinding = {
  ruleId: string;
  severity: RuleSeverity;
  blocks: ValidationTarget[];
  entityIds: string[];
  message: string;
  rationale: string;
  evidence: Array<{
    kind: "vendor" | "standard" | "calculation" | "field-guide" | "user";
    reference: string;
    confidence: "high" | "medium" | "low";
  }>;
  suggestedActions?: string[];
  details?: Record<string, string | number>;
};

const FIELD_GUIDE_EVIDENCE = [
  {
    kind: "field-guide" as const,
    reference: "design-aluminum-profile-furniture/references/haojia-field-guide.md",
    confidence: "low" as const,
  },
];

const severityOrder: Record<RuleSeverity, number> = { error: 0, warning: 1, info: 2 };

function isMainSpan(profile: ProfileInstance): boolean {
  const purpose = profile.purpose.toLowerCase();
  return (
    purpose.includes("main-span") ||
    purpose.includes("long-span") ||
    purpose.includes("主梁") ||
    purpose.includes("主跨")
  );
}

function isBrace(profile: ProfileInstance): boolean {
  const purpose = profile.purpose.toLowerCase();
  return ["brace", "anti-sway", "crossbar", "斜撑", "横撑"].some((token) =>
    purpose.includes(token),
  );
}

function verticalSectionSize(project: ProjectDocumentV1, profile: ProfileInstance): number | null {
  if (profile.axis === "z") return null;
  const definition =
    project.embeddedParts[partKey(profile.definitionRef.partId, profile.definitionRef.revision)]
      ?.definition;
  if (!definition) return null;
  const rotated = profile.rotationAroundAxisDeg === 90 || profile.rotationAroundAxisDeg === 270;
  if (profile.axis === "x") {
    return rotated ? definition.section.envelopeUMm : definition.section.envelopeVMm;
  }
  return rotated ? definition.section.envelopeVMm : definition.section.envelopeUMm;
}

export function evaluateRules(project: ProjectDocumentV1): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const allEntityIds = Object.keys(project.entities).sort(compareCanonicalText);
  let parameterValues: Record<string, number> | null = null;
  try {
    parameterValues = evaluateParameters(project.parameters);
  } catch (error) {
    if (error instanceof DomainError && error.code === "dimension.parameter-cycle") {
      findings.push({
        ruleId: "dimension.parameter-cycle",
        severity: "error",
        blocks: ["edit", "order-draft", "order-ready"],
        entityIds: [],
        message: error.message,
        rationale: "成环的尺寸链没有唯一单向求值结果。",
        evidence: [],
        suggestedActions: ["移除环路中的一个反向依赖"],
      });
    }
  }

  if (parameterValues) {
    for (const binding of project.bindings) {
      const profile = project.entities[binding.entityId];
      const expected = parameterValues[binding.param];
      if (!profile || expected === undefined) continue;
      if (Math.abs(getBoundField(profile, binding.field) - expected) > 0.005) {
        findings.push({
          ruleId: "dimension.parameter-binding-stale",
          severity: "warning",
          blocks: [],
          entityIds: [profile.id],
          message: `${profile.purpose} 的 ${binding.field} 已手工覆盖，与参数 ${binding.param} 失同步。`,
          rationale: "继续修改参数时，失同步字段不会被静默覆盖。",
          evidence: [],
          suggestedActions: ["重同步字段", "确认后解除绑定"],
          details: { field: binding.field, param: binding.param },
        });
      }
    }
  }

  const mainSpans = Object.values(project.entities).filter(
    (profile) => isMainSpan(profile) && profile.lengthMm >= 1_500,
  );
  const structuralSizing = evaluateStructuralSizing(project);
  const sizedEntityIds = new Set(structuralSizing?.study.beamEntityIds ?? []);
  if (structuralSizing) {
    const selected = structuralSizing.selected;
    const calculationEvidence = structuralSizing.study.calculationSources.map((source) => ({
      kind: "calculation" as const,
      reference: source.url,
      confidence: "high" as const,
    }));
    findings.push(
      selected
        ? {
            ruleId: "structure.beam-sizing-screen",
            severity: "info",
            blocks: [],
            entityIds: structuralSizing.study.beamEntityIds,
            message: `${selected.candidate.sku} 是当前候选集中满足挠度、高度和接口体系约束且质量最小的主梁。`,
            rationale: `理想简支梁计算挠度 ${selected.deflectionMm.toFixed(2)} mm，不大于 ${selected.deflectionLimitMm.toFixed(2)} mm；截面不超过 ${structuralSizing.maximumSectionHeightMm.toFixed(0)} mm，并匹配 ${structuralSizing.study.requiredCompatibilityGroup}。`,
            evidence: [
              {
                kind: "vendor",
                reference: selected.candidate.source.url,
                confidence: "high",
              },
              ...calculationEvidence,
            ],
            suggestedActions: ["核对具体 SKU 与强轴朝向", "单独验证连接、侧摆、倾覆和脚轮"],
            details: {
              sku: selected.candidate.sku,
              spanMm: structuralSizing.effectiveSpanMm,
              deflectionMm: selected.deflectionMm,
              deflectionLimitMm: selected.deflectionLimitMm,
              beamSetMassKg: selected.beamSetMassKg,
              bendingStressNPerMm2: selected.bendingStressNPerMm2,
              maximumSectionHeightMm: structuralSizing.maximumSectionHeightMm,
              requiredCompatibilityGroup: structuralSizing.study.requiredCompatibilityGroup,
            },
          }
        : {
            ruleId: "structure.beam-sizing-no-pass",
            severity: "warning",
            blocks: [],
            entityIds: structuralSizing.study.beamEntityIds,
            message: "当前候选集中没有型材同时满足挠度、高度和接口体系约束。",
            rationale:
              "结果只覆盖理想简支梁；调整载荷、截面高度、接口体系、支点或主梁数量后需要重新计算。",
            evidence: calculationEvidence,
            suggestedActions: ["检查各候选的挠度、高度和接口排除原因", "调整明确约束后重新计算"],
            details: {
              spanMm: structuralSizing.effectiveSpanMm,
              maximumSectionHeightMm: structuralSizing.maximumSectionHeightMm,
              requiredCompatibilityGroup: structuralSizing.study.requiredCompatibilityGroup,
            },
          },
    );
  }
  for (const profile of mainSpans) {
    if (!sizedEntityIds.has(profile.id)) {
      findings.push({
        ruleId: "structure.long-span-review",
        severity: "warning",
        blocks: [],
        entityIds: [profile.id],
        message: `${profile.purpose} 跨度 ${profile.lengthMm.toFixed(0)} mm，需要挠度复核。`,
        rationale: "1500 mm 是低置信度提醒阈值，不代表额定承载或结构不合格。",
        evidence: FIELD_GUIDE_EVIDENCE,
        suggestedActions: ["核对厂家截面惯性矩", "考虑增加截面高度、双梁或中间支撑"],
        details: { lengthMm: profile.lengthMm },
      });
    }

    const vertical = verticalSectionSize(project, profile);
    const definition =
      project.embeddedParts[partKey(profile.definitionRef.partId, profile.definitionRef.revision)]
        ?.definition;
    if (vertical && definition) {
      const horizontal =
        vertical === definition.section.envelopeUMm
          ? definition.section.envelopeVMm
          : definition.section.envelopeUMm;
      if (vertical < horizontal) {
        findings.push({
          ruleId: "structure.section-orientation",
          severity: "warning",
          blocks: [],
          entityIds: [profile.id],
          message: `${profile.purpose} 当前竖向截面仅 ${vertical} mm，较大截面没有朝 Z 方向。`,
          rationale: "长梁通常通过增加竖向截面高度降低弯曲挠度。",
          evidence: FIELD_GUIDE_EVIDENCE,
          suggestedActions: ["将截面绕轴旋转 90° 后重新复核"],
          details: { verticalMm: vertical },
        });
      }
    }
  }

  if (project.context.mobility === "casters" && !Object.values(project.entities).some(isBrace)) {
    findings.push({
      ruleId: "structure.mobile-side-sway",
      severity: "warning",
      blocks: [],
      entityIds: allEntityIds,
      message: "移动结构尚未建模横撑、斜撑或等效抗侧摆构件。",
      rationale: "反复移动会放大节点间隙与左右剪切。",
      evidence: FIELD_GUIDE_EVIDENCE,
      suggestedActions: ["增加三角撑、大角板或横向中梁", "完成后做锁轮侧推测试"],
    });
  }

  if (project.context.mobility === "casters" && project.context.floor === "wood") {
    findings.push({
      ruleId: "caster.wood-floor-soft-tread",
      severity: "warning",
      blocks: [],
      entityIds: [],
      message: "木地板移动结构应优先选择软质聚氨酯或橡胶轮面。",
      rationale: "硬尼龙小轮更容易压伤地板，也更难跨越地板缝。",
      evidence: FIELD_GUIDE_EVIDENCE,
      suggestedActions: ["P2 选择脚轮时记录轮面、轮径和安装总高"],
    });
  }

  if (
    project.context.mobility === "casters" &&
    project.context.loads.some((load) => /projector|投影|electrical|电器/i.test(load))
  ) {
    findings.push({
      ruleId: "motion.cable-routing-safe",
      severity: "warning",
      blocks: [],
      entityIds: [],
      message: "移动桌上的电器线缆需要避开脚轮行程。",
      rationale: "未固定的电线可能被脚轮碾压或拖拽设备跌落。",
      evidence: FIELD_GUIDE_EVIDENCE,
      suggestedActions: ["预留线缆挂点或拖链", "全行程检查插座与线缆余量"],
    });
  }

  if (project.context.humanLoad === true || project.context.childAccess === true) {
    findings.push({
      ruleId: "safety.human-load-review",
      severity: "warning",
      blocks: [],
      entityIds: allEntityIds,
      message: "涉及人身承载或儿童攀爬，必须进行结构工程复核。",
      rationale: "经验规则不能替代额定载荷、连接件数据或结构计算。",
      evidence: FIELD_GUIDE_EVIDENCE,
      suggestedActions: ["取得厂家数据并进行专业复核"],
    });
  }

  return findings.sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      compareCanonicalText(left.ruleId, right.ruleId) ||
      compareCanonicalText(left.entityIds.join("|"), right.entityIds.join("|")),
  );
}

export function canProceed(findings: RuleFinding[], target: ValidationTarget): boolean {
  return !findings.some((finding) => finding.blocks.includes(target));
}
