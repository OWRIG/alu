import type { RuleFinding } from "../../../domain/rules/evaluate";
import type { BindingField, ProjectDocumentV1 } from "../../../domain/project/schema";
import { enUS, zhCN, type MessageKey } from "./messages";
import type { Locale, Translator } from "./i18n";

const parameterKeys: Record<string, MessageKey> = {
  bedOuterWidth: "parameter.bedOuterWidth",
  mattressTopHeight: "parameter.mattressTopHeight",
  clearanceLeft: "parameter.clearanceLeft",
  clearanceRight: "parameter.clearanceRight",
  uprightWidthX: "parameter.uprightWidthX",
  topFrameHeight: "parameter.topFrameHeight",
  topFrameOuterDepth: "parameter.topFrameOuterDepth",
  panelFitClearance: "parameter.panelFitClearance",
  tabletopThickness: "parameter.tabletopThickness",
  finishedHeight: "parameter.finishedHeight",
  innerClearWidth: "parameter.innerClearWidth",
  frameOuterWidth: "parameter.frameOuterWidth",
  topFrameInnerWidth: "parameter.topFrameInnerWidth",
  topFrameInnerDepth: "parameter.topFrameInnerDepth",
  tabletopWidth: "parameter.tabletopWidth",
  tabletopDepth: "parameter.tabletopDepth",
  clearanceAboveMattress: "parameter.clearanceAboveMattress",
  beamUndersideClearance: "parameter.beamUndersideClearance",
  uprightLength: "parameter.uprightLength",
  topBeamCenterZ: "parameter.topBeamCenterZ",
  leftUprightCenterX: "parameter.leftUprightCenterX",
  rightUprightCenterX: "parameter.rightUprightCenterX",
  frontTopBeamCenterY: "parameter.frontTopBeamCenterY",
  rearTopBeamCenterY: "parameter.rearTopBeamCenterY",
  rearUprightCenterY: "parameter.rearUprightCenterY",
  topSideRailStartY: "parameter.topSideRailStartY",
};

const boundaryKeys: Record<string, MessageKey> = {
  "obstacle-outer": "boundary.obstacleOuter",
  clearance: "boundary.clearance",
  "inner-clear": "boundary.innerClear",
  "frame-outer": "boundary.frameOuter",
  panel: "boundary.panel",
  height: "boundary.height",
  generic: "boundary.generic",
};

const legacyParameterLabels: Record<string, string[]> = {
  clearanceLeft: ["左动态余量"],
  clearanceRight: ["右动态余量"],
  uprightWidthX: ["围框/立柱横向宽"],
  finishedHeight: ["桌面成品高"],
};

const defaultPurposeKeys: Record<string, { key: MessageKey; values: string[] }> = {
  "profile.top-front": {
    key: "profile.topBeam",
    values: ["顶部长跨主梁", "Long-span top beam"],
  },
  "profile.top-rear": {
    key: "profile.topBeam",
    values: ["顶部长跨主梁", "Long-span top beam"],
  },
  "profile.top-side-left": {
    key: "profile.topSideRail",
    values: ["顶部围框侧梁", "Top-frame side rail"],
  },
  "profile.top-side-right": {
    key: "profile.topSideRail",
    values: ["顶部围框侧梁", "Top-frame side rail"],
  },
  "profile.upright-left-front": { key: "profile.upright", values: ["立柱", "Upright"] },
  "profile.upright-left-rear": { key: "profile.upright", values: ["立柱", "Upright"] },
  "profile.upright-right-front": { key: "profile.upright", values: ["立柱", "Upright"] },
  "profile.upright-right-rear": { key: "profile.upright", values: ["立柱", "Upright"] },
  "profile.base-left": { key: "profile.baseRail", values: ["底部侧梁", "Base side rail"] },
  "profile.base-right": { key: "profile.baseRail", values: ["底部侧梁", "Base side rail"] },
};

export function localizeParameterLabel(id: string, fallback: string | undefined, t: Translator) {
  const key = parameterKeys[id];
  if (!key) return fallback ?? id;
  const isBuiltIn =
    fallback === undefined ||
    fallback === zhCN[key] ||
    fallback === enUS[key] ||
    legacyParameterLabels[id]?.includes(fallback);
  return isBuiltIn ? t(key) : fallback;
}

export function localizeBoundary(kind: string | undefined, t: Translator) {
  return t(boundaryKeys[kind ?? "generic"] ?? "boundary.generic");
}

export function localizeProjectName(project: ProjectDocumentV1, t: Translator) {
  if (
    project.context.usage.includes("overbed-table") &&
    ["移动跨床桌概念方案", "Mobile Overbed Table Concept"].includes(project.meta.name)
  ) {
    return localizeKnownProjectName(project.meta.name, t);
  }
  return localizeKnownProjectName(project.meta.name, t);
}

export function localizeKnownProjectName(name: string, t: Translator) {
  if (["移动跨床桌概念方案", "Mobile Overbed Table Concept"].includes(name)) {
    return t("project.demoName");
  }
  return ["未命名工程", "Untitled Project"].includes(name) ? t("project.untitled") : name;
}

export function localizeProfilePurpose(entityId: string, purpose: string, t: Translator) {
  const builtIn = defaultPurposeKeys[entityId];
  if (builtIn?.values.includes(purpose)) return t(builtIn.key);

  const customMatch = /^(?:自定义构件|Custom member)\s+(\d+)$/.exec(purpose);
  if (entityId.startsWith("profile.member-") && customMatch) {
    return t("profile.custom", { number: customMatch[1] });
  }
  return purpose;
}

export function localizeDefinitionName(partId: string, fallback: string, t: Translator) {
  const match = /^generic\.profile\.(\d+)-envelope$/.exec(partId);
  if (!match) return fallback;
  const size = match[1];
  const isBuiltIn = [
    translateDefinitionName("zh-CN", size),
    translateDefinitionName("en-US", size),
  ].includes(fallback);
  return isBuiltIn ? t("definition.conceptEnvelope", { size }) : fallback;
}

function translateDefinitionName(locale: Locale, size: string) {
  const template =
    locale === "zh-CN" ? zhCN["definition.conceptEnvelope"] : enUS["definition.conceptEnvelope"];
  return template.replace("{size}", size);
}

function fieldLabel(field: BindingField, t: Translator) {
  const keys: Record<BindingField, MessageKey> = {
    lengthMm: "field.lengthMm",
    "origin.x": "field.originX",
    "origin.y": "field.originY",
    "origin.z": "field.originZ",
  };
  return t(keys[field]);
}

export type LocalizedFinding = {
  message: string;
  rationale: string;
  suggestedActions?: string[];
};

export function localizeFinding(
  finding: RuleFinding,
  project: ProjectDocumentV1,
  t: Translator,
): LocalizedFinding {
  const profileId = finding.entityIds[0];
  const profile = profileId ? project.entities[profileId] : undefined;
  const purpose = profile ? localizeProfilePurpose(profile.id, profile.purpose, t) : "";

  switch (finding.ruleId) {
    case "dimension.parameter-cycle":
      return {
        message: t("rule.parameterCycle.message"),
        rationale: t("rule.parameterCycle.rationale"),
        suggestedActions: [t("rule.parameterCycle.action1")],
      };
    case "dimension.parameter-binding-stale": {
      const binding = project.bindings.find(
        (item) => item.entityId === profileId && item.field === finding.details?.field,
      );
      const field = binding?.field ?? "lengthMm";
      const parameterId = binding?.param ?? String(finding.details?.param ?? "");
      const parameter = localizeParameterLabel(
        parameterId,
        project.parameters.inputs[parameterId]?.label ??
          project.parameters.derived[parameterId]?.label ??
          parameterId,
        t,
      );
      return {
        message: t("rule.bindingStale.message", {
          purpose,
          field: fieldLabel(field, t),
          parameter,
        }),
        rationale: t("rule.bindingStale.rationale"),
        suggestedActions: [t("rule.bindingStale.action1"), t("rule.bindingStale.action2")],
      };
    }
    case "structure.long-span-review":
      return {
        message: t("rule.longSpan.message", {
          purpose,
          length: finding.details?.lengthMm ?? profile?.lengthMm ?? "—",
        }),
        rationale: t("rule.longSpan.rationale"),
        suggestedActions: [t("rule.longSpan.action1"), t("rule.longSpan.action2")],
      };
    case "structure.section-orientation":
      return {
        message: t("rule.orientation.message", {
          purpose,
          vertical: finding.details?.verticalMm ?? "—",
        }),
        rationale: t("rule.orientation.rationale"),
        suggestedActions: [t("rule.orientation.action1")],
      };
    case "structure.mobile-side-sway":
      return {
        message: t("rule.sideSway.message"),
        rationale: t("rule.sideSway.rationale"),
        suggestedActions: [t("rule.sideSway.action1"), t("rule.sideSway.action2")],
      };
    case "caster.wood-floor-soft-tread":
      return {
        message: t("rule.softTread.message"),
        rationale: t("rule.softTread.rationale"),
        suggestedActions: [t("rule.softTread.action1")],
      };
    case "motion.cable-routing-safe":
      return {
        message: t("rule.cable.message"),
        rationale: t("rule.cable.rationale"),
        suggestedActions: [t("rule.cable.action1"), t("rule.cable.action2")],
      };
    case "safety.human-load-review":
      return {
        message: t("rule.humanLoad.message"),
        rationale: t("rule.humanLoad.rationale"),
        suggestedActions: [t("rule.humanLoad.action1")],
      };
    default:
      return finding;
  }
}

export function localizeEvidenceKind(kind: RuleFinding["evidence"][number]["kind"], t: Translator) {
  const keys = {
    vendor: "evidence.vendor",
    standard: "evidence.standard",
    calculation: "evidence.calculation",
    "field-guide": "evidence.fieldGuide",
    user: "evidence.user",
  } as const;
  return t(keys[kind]);
}

export function localizeConfidence(
  confidence: RuleFinding["evidence"][number]["confidence"],
  t: Translator,
) {
  const keys = {
    high: "confidence.high",
    medium: "confidence.medium",
    low: "confidence.low",
  } as const;
  return t(keys[confidence]);
}

export type UiError = {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
};

const errorKeys: Record<string, MessageKey> = {
  "command.schema-invalid": "error.invalidEdit",
  "project.command-result-invalid": "error.invalidEdit",
  "schema.invalid": "error.invalidProject",
  "project.invalid-json": "error.invalidJson",
  "project.file-too-large": "error.fileTooLarge",
  "revision.conflict": "error.revisionConflict",
  "ref.entity-missing": "error.missingEntity",
  "dimension.input-missing": "error.missingParameter",
  "ref.parameter-missing": "error.missingParameter",
  "dimension.parameter-ref-missing": "error.missingParameter",
  "ref.definition-missing": "error.missingDefinition",
  "ref.definition-mismatch": "error.definitionConflict",
  "catalog.snapshot-key-mismatch": "error.definitionConflict",
  "catalog.definition-hash-mismatch": "error.definitionConflict",
  "catalog.definition-conflict": "error.definitionConflict",
  "binding.missing": "error.bindingMissing",
  "internal.unexpected": "error.unexpected",
};

export function localizeError(error: UiError, locale: Locale, t: Translator) {
  if (locale === "zh-CN") {
    return [
      error.message,
      error.path ? t("error.location", { path: error.path }) : null,
      error.suggestion,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const invalidLength = /长度必须大于 0 mm|Length must be greater than 0 mm/i.test(error.message);
  const key = invalidLength ? "error.invalidLength" : errorKeys[error.code];
  const message = key
    ? t(key)
    : /[\u3400-\u9fff]/u.test(error.message)
      ? t("error.unexpected")
      : error.message;
  return [message, error.path ? t("error.location", { path: error.path }) : null]
    .filter(Boolean)
    .join(" · ");
}
