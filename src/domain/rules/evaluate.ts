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

function sectionWorldDimensions(
  project: ProjectDocumentV1,
  profile: ProfileInstance,
): { verticalMm: number; horizontalMm: number } | null {
  if (profile.axis === "z") return null;
  const definition =
    project.embeddedParts[partKey(profile.definitionRef.partId, profile.definitionRef.revision)]
      ?.definition;
  if (!definition) return null;
  const rotated = profile.rotationAroundAxisDeg === 90 || profile.rotationAroundAxisDeg === 270;
  if (profile.axis === "x") {
    return rotated
      ? {
          verticalMm: definition.section.envelopeUMm,
          horizontalMm: definition.section.envelopeVMm,
        }
      : {
          verticalMm: definition.section.envelopeVMm,
          horizontalMm: definition.section.envelopeUMm,
        };
  }
  return rotated
    ? {
        verticalMm: definition.section.envelopeVMm,
        horizontalMm: definition.section.envelopeUMm,
      }
    : {
        verticalMm: definition.section.envelopeUMm,
        horizontalMm: definition.section.envelopeVMm,
      };
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
    (profile) => profile.axis !== "z" && profile.lengthMm >= 1_500,
  );
  const structuralSizing = evaluateStructuralSizing(project);
  const sizedEntityIds = new Set(structuralSizing?.study.beamEntityIds ?? []);
  if (structuralSizing) {
    const selected = structuralSizing.selected;
    const compatibility = structuralSizing.study.requiredCompatibilityGroup;
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
            message: `${selected.candidate.sku} 是当前候选集中满足挠度与明确空间约束且质量最小的主梁。`,
            rationale: `理想简支梁计算挠度 ${selected.deflectionMm.toFixed(2)} mm，不大于 ${selected.deflectionLimitMm.toFixed(2)} mm；截面不超过 ${structuralSizing.maximumSectionHeightMm.toFixed(0)} mm${compatibility ? `，并匹配 ${compatibility}` : "，未设置接口体系过滤"}。`,
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
              ...(compatibility ? { requiredCompatibilityGroup: compatibility } : {}),
            },
          }
        : {
            ruleId: "structure.beam-sizing-no-pass",
            severity: "warning",
            blocks: [],
            entityIds: structuralSizing.study.beamEntityIds,
            message: "当前候选集中没有型材同时满足挠度与明确空间约束。",
            rationale:
              "结果只覆盖理想简支梁；调整载荷、截面高度、接口体系、支点或主梁数量后需要重新计算。",
            evidence: calculationEvidence,
            suggestedActions: ["检查各候选的挠度、高度和接口排除原因", "调整明确约束后重新计算"],
            details: {
              spanMm: structuralSizing.effectiveSpanMm,
              maximumSectionHeightMm: structuralSizing.maximumSectionHeightMm,
              ...(compatibility ? { requiredCompatibilityGroup: compatibility } : {}),
            },
          },
    );

    if (parameterValues) {
      const expectedWidth = structuralSizing.study.appliedSectionWidthParam
        ? parameterValues[structuralSizing.study.appliedSectionWidthParam]
        : undefined;
      const expectedHeight = structuralSizing.study.appliedSectionHeightParam
        ? parameterValues[structuralSizing.study.appliedSectionHeightParam]
        : undefined;
      for (const entityId of structuralSizing.study.beamEntityIds) {
        const profile = project.entities[entityId];
        const actual = profile ? sectionWorldDimensions(project, profile) : null;
        if (!actual) continue;
        const widthMismatch =
          expectedWidth !== undefined && Math.abs(actual.horizontalMm - expectedWidth) > 0.005;
        const heightMismatch =
          expectedHeight !== undefined && Math.abs(actual.verticalMm - expectedHeight) > 0.005;
        if (widthMismatch || heightMismatch) {
          findings.push({
            ruleId: "structure.section-parameter-mismatch",
            severity: "error",
            blocks: ["order-draft", "order-ready"],
            entityIds: [entityId],
            message: `${profile.purpose} 的实际截面与尺寸链参数不一致。`,
            rationale: "几何包络、尺寸链和切料 definition 必须引用同一组截面尺寸。",
            evidence: [],
            suggestedActions: ["重新应用当前梁选型", "或把实际截面参数改回 definition 包络尺寸"],
            details: {
              actualWidthMm: actual.horizontalMm,
              actualHeightMm: actual.verticalMm,
              ...(expectedWidth !== undefined ? { expectedWidthMm: expectedWidth } : {}),
              ...(expectedHeight !== undefined ? { expectedHeightMm: expectedHeight } : {}),
            },
          });
        }
      }
    }
  }
  for (const profile of mainSpans) {
    if (!sizedEntityIds.has(profile.id)) {
      findings.push({
        ruleId: "structure.long-span-review",
        severity: "info",
        blocks: [],
        entityIds: [profile.id],
        message: `${profile.purpose} 跨度 ${profile.lengthMm.toFixed(0)} mm，还没有建立选型研究。`,
        rationale: "1500 mm 只是提醒阈值。要知道这根梁够不够粗，需要一次带载荷的挠度计算。",
        evidence: FIELD_GUIDE_EVIDENCE,
        suggestedActions: ["为这根梁创建选型研究", "或考虑增加截面高度、双梁或中间支撑"],
        details: { lengthMm: profile.lengthMm },
      });
    }

    const section = sectionWorldDimensions(project, profile);
    if (section) {
      if (section.verticalMm < section.horizontalMm) {
        findings.push({
          ruleId: "structure.section-orientation",
          severity: "warning",
          blocks: [],
          entityIds: [profile.id],
          message: `${profile.purpose} 当前竖向截面仅 ${section.verticalMm} mm，较大截面没有朝 Z 方向。`,
          rationale: "长梁通常通过增加竖向截面高度降低弯曲挠度。",
          evidence: FIELD_GUIDE_EVIDENCE,
          suggestedActions: ["将截面绕轴旋转 90° 后重新复核"],
          details: { verticalMm: section.verticalMm },
        });
      }
    }
  }

  if (project.extensions?.notForOrdering === true) {
    findings.push({
      ruleId: "project.order-data-incomplete",
      severity: "warning",
      blocks: ["order-ready"],
      entityIds: allEntityIds,
      message: "当前工程仍是设计稿，订单数据尚未补齐。",
      rationale: "型材切料不等于完整订单；连接件、加工、紧固件、脚轮实测、板材与托承接口仍需确认。",
      evidence: [],
      suggestedActions: [
        "实测脚轮与连接板安装总高并复核立柱切长",
        "补齐节点、加工、紧固件、板材和托承清单后再解除 notForOrdering",
      ],
    });
  }

  const hasJoints = Object.keys(project.joints ?? {}).length > 0;
  if (project.context.mobility === "casters") {
    findings.push({
      ruleId: "structure.mobile-side-sway",
      severity: "warning",
      blocks: [],
      entityIds: allEntityIds,
      message: hasJoints
        ? "抗侧摆没有被计算：连接已建模，但节点刚度还没有算。"
        : "移动结构的抗侧摆没有被计算，因为当前模型还没有连接。",
      rationale: "连接方式不能替代刚度计算；需要侧推验证。",
      evidence: FIELD_GUIDE_EVIDENCE,
      suggestedActions: [
        "装配前预留三角撑、大角板或横向中梁的位置",
        "装配后做锁轮侧推测试并记录结论",
      ],
    });
  }

  if (
    project.context.mobility === "casters" &&
    (!parameterValues || !(parameterValues.casterInstalledHeight > 0))
  ) {
    findings.push({
      ruleId: "caster.installed-height-required",
      severity: "error",
      blocks: ["order-draft", "order-ready"],
      entityIds: [],
      message: "脚轮安装总高尚未确认，立柱订单长度不能定稿。",
      rationale: "立柱切长必须从完成面高度中扣除脚轮安装后从地面到框架安装面的实际高度。",
      evidence: FIELD_GUIDE_EVIDENCE,
      suggestedActions: ["选定脚轮后填写 casterInstalledHeight", "复核立柱起点、切长和完成面高度"],
    });
  }

  if (project.context.mobility === "casters" && project.context.floor === "wood") {
    findings.push({
      ruleId: "caster.wood-floor-soft-tread",
      severity: "info",
      blocks: [],
      entityIds: [],
      message: "木地板移动结构应优先选择软质聚氨酯或橡胶轮面。",
      rationale: "硬尼龙小轮更容易压伤地板，也更难跨越地板缝。",
      evidence: FIELD_GUIDE_EVIDENCE,
      suggestedActions: ["核对已选脚轮的轮面、轮径和实物安装总高"],
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
