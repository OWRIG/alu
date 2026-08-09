import { computeDefinitionHash } from "./hash";
import type { EmbeddedProfileSnapshot, ProfileDefinition, ProjectDocumentV1 } from "./schema";

function makeGenericDefinition(
  id: string,
  name: string,
  envelopeUMm: number,
  envelopeVMm: number,
): ProfileDefinition {
  return {
    id,
    revision: "1",
    kind: "profile",
    name,
    unit: "millimeter",
    section: {
      envelopeUMm,
      envelopeVMm,
      representation: "rectangular-envelope",
      referencePoint: "envelope-center",
    },
    evidence: [
      {
        kind: "field-guide",
        reference: "通用截面包络，仅用于概念建模；采购前核对实际目录",
        confidence: "low",
      },
    ],
  };
}

export const GENERIC_PROFILE_DEFINITIONS = [
  makeGenericDefinition("generic.profile.2020-envelope", "概念 2020 包络", 20, 20),
  makeGenericDefinition("generic.profile.3030-envelope", "概念 3030 包络", 30, 30),
  makeGenericDefinition("generic.profile.4040-envelope", "概念 4040 包络", 40, 40),
  makeGenericDefinition("generic.profile.4080-envelope", "概念 4080 包络", 40, 80),
] as const;

export function snapshotDefinition(definition: ProfileDefinition): EmbeddedProfileSnapshot {
  return { definition, definitionHash: computeDefinitionHash(definition) };
}

function newProjectMeta(name: string, now: string) {
  return { name, createdAt: now, updatedAt: now, appVersion: "0.1.0", units: "mm" as const };
}

export function createBlankProject(options?: {
  projectId?: string;
  now?: string;
  name?: string;
}): ProjectDocumentV1 {
  const now = options?.now ?? new Date().toISOString();
  return {
    formatVersion: 1,
    projectId: options?.projectId ?? `project.${globalThis.crypto.randomUUID()}`,
    revision: 0,
    meta: newProjectMeta(options?.name ?? "未命名工程", now),
    context: {
      usage: [],
      humanLoad: "unknown",
      childAccess: "unknown",
      mobility: "unknown",
      floor: "unknown",
      loads: [],
    },
    parameters: { inputs: {}, derived: {} },
    bindings: [],
    entities: {},
    embeddedParts: {},
  };
}

export function createMobileOverbedDemo(options?: {
  projectId?: string;
  now?: string;
}): ProjectDocumentV1 {
  const now = options?.now ?? new Date().toISOString();
  const definition = GENERIC_PROFILE_DEFINITIONS[3];
  const snapshot = snapshotDefinition(definition);
  return {
    formatVersion: 1,
    projectId: options?.projectId ?? `project.${globalThis.crypto.randomUUID()}`,
    revision: 0,
    meta: newProjectMeta("移动跨床桌概念方案", now),
    context: {
      usage: ["overbed-table"],
      humanLoad: false,
      childAccess: "unknown",
      mobility: "casters",
      floor: "wood",
      loads: ["laptop", "meal", "small-projector"],
      notes:
        "桌板采用四边围框内托平嵌：18 mm 板落在内侧连续托条或层板托上，顶面与型材上沿齐平，四周单边预留 2 mm 安装缝。先装框并校正对角线，实测后再下板。概念阶段仍未确认脚轮、主节点、托件接口、厂家截面数据与试载。",
    },
    parameters: {
      inputs: {
        bedOuterWidth: {
          valueMm: 2100,
          label: "床架最外沿宽",
          boundaryKind: "obstacle-outer",
        },
        mattressTopHeight: {
          valueMm: 500,
          label: "床垫上表面离地",
          boundaryKind: "height",
        },
        clearanceLeft: { valueMm: 25, label: "左动态余量", boundaryKind: "clearance" },
        clearanceRight: { valueMm: 25, label: "右动态余量", boundaryKind: "clearance" },
        uprightWidthX: { valueMm: 40, label: "围框/立柱横向宽", boundaryKind: "generic" },
        topFrameHeight: { valueMm: 80, label: "顶框型材占高", boundaryKind: "generic" },
        topFrameOuterDepth: { valueMm: 500, label: "顶框外深", boundaryKind: "frame-outer" },
        panelFitClearance: { valueMm: 2, label: "嵌板单边安装缝", boundaryKind: "panel" },
        tabletopThickness: { valueMm: 18, label: "桌板厚度", boundaryKind: "panel" },
        finishedHeight: { valueMm: 750, label: "桌面成品高", boundaryKind: "height" },
      },
      derived: {
        innerClearWidth: {
          label: "结构内净宽",
          terms: [
            { param: "bedOuterWidth", coef: 1 },
            { param: "clearanceLeft", coef: 1 },
            { param: "clearanceRight", coef: 1 },
          ],
          constantMm: 0,
        },
        frameOuterWidth: {
          label: "骨架外宽",
          terms: [
            { param: "innerClearWidth", coef: 1 },
            { param: "uprightWidthX", coef: 2 },
          ],
          constantMm: 0,
        },
        topFrameInnerWidth: {
          label: "顶框槽内净宽",
          terms: [
            { param: "frameOuterWidth", coef: 1 },
            { param: "uprightWidthX", coef: -2 },
          ],
          constantMm: 0,
        },
        topFrameInnerDepth: {
          label: "顶框槽内净深",
          terms: [
            { param: "topFrameOuterDepth", coef: 1 },
            { param: "uprightWidthX", coef: -2 },
          ],
          constantMm: 0,
        },
        tabletopWidth: {
          label: "平嵌桌板宽",
          terms: [
            { param: "topFrameInnerWidth", coef: 1 },
            { param: "panelFitClearance", coef: -2 },
          ],
          constantMm: 0,
        },
        tabletopDepth: {
          label: "平嵌桌板深",
          terms: [
            { param: "topFrameInnerDepth", coef: 1 },
            { param: "panelFitClearance", coef: -2 },
          ],
          constantMm: 0,
        },
        clearanceAboveMattress: {
          label: "桌板下表面离床垫",
          terms: [
            { param: "finishedHeight", coef: 1 },
            { param: "tabletopThickness", coef: -1 },
            { param: "mattressTopHeight", coef: -1 },
          ],
          constantMm: 0,
        },
        beamUndersideClearance: {
          label: "主梁下方实际净空",
          terms: [
            { param: "finishedHeight", coef: 1 },
            { param: "topFrameHeight", coef: -1 },
            { param: "mattressTopHeight", coef: -1 },
          ],
          constantMm: 0,
        },
        uprightLength: {
          label: "立柱净长",
          terms: [
            { param: "finishedHeight", coef: 1 },
            { param: "topFrameHeight", coef: -1 },
          ],
          constantMm: 0,
        },
        topBeamCenterZ: {
          label: "顶梁中心高",
          terms: [
            { param: "uprightLength", coef: 1 },
            { param: "topFrameHeight", coef: 0.5 },
          ],
          constantMm: 0,
        },
        leftUprightCenterX: {
          label: "左立柱中心 X",
          terms: [{ param: "uprightWidthX", coef: 0.5 }],
          constantMm: 0,
        },
        rightUprightCenterX: {
          label: "右立柱中心 X",
          terms: [
            { param: "frameOuterWidth", coef: 1 },
            { param: "uprightWidthX", coef: -0.5 },
          ],
          constantMm: 0,
        },
        frontTopBeamCenterY: {
          label: "前顶梁中心 Y",
          terms: [{ param: "uprightWidthX", coef: 0.5 }],
          constantMm: 0,
        },
        rearTopBeamCenterY: {
          label: "后顶梁中心 Y",
          terms: [
            { param: "topFrameOuterDepth", coef: 1 },
            { param: "uprightWidthX", coef: -0.5 },
          ],
          constantMm: 0,
        },
        rearUprightCenterY: {
          label: "后立柱中心 Y",
          terms: [
            { param: "topFrameOuterDepth", coef: 1 },
            { param: "uprightWidthX", coef: -1 },
          ],
          constantMm: 0,
        },
        topSideRailStartY: {
          label: "顶框侧梁起点 Y",
          terms: [{ param: "uprightWidthX", coef: 1 }],
          constantMm: 0,
        },
      },
    },
    bindings: [
      { entityId: "profile.top-front", field: "lengthMm", param: "frameOuterWidth" },
      { entityId: "profile.top-rear", field: "lengthMm", param: "frameOuterWidth" },
      { entityId: "profile.top-front", field: "origin.z", param: "topBeamCenterZ" },
      { entityId: "profile.top-rear", field: "origin.z", param: "topBeamCenterZ" },
      { entityId: "profile.top-front", field: "origin.y", param: "frontTopBeamCenterY" },
      { entityId: "profile.top-rear", field: "origin.y", param: "rearTopBeamCenterY" },
      { entityId: "profile.top-side-left", field: "lengthMm", param: "topFrameInnerDepth" },
      { entityId: "profile.top-side-right", field: "lengthMm", param: "topFrameInnerDepth" },
      { entityId: "profile.top-side-left", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.top-side-right", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.top-side-left", field: "origin.y", param: "topSideRailStartY" },
      { entityId: "profile.top-side-right", field: "origin.y", param: "topSideRailStartY" },
      { entityId: "profile.top-side-left", field: "origin.z", param: "topBeamCenterZ" },
      { entityId: "profile.top-side-right", field: "origin.z", param: "topBeamCenterZ" },
      { entityId: "profile.upright-left-front", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-left-rear", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-right-front", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-right-rear", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-left-front", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.upright-left-rear", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.upright-right-front", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.upright-right-rear", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.upright-left-rear", field: "origin.y", param: "rearUprightCenterY" },
      { entityId: "profile.upright-right-rear", field: "origin.y", param: "rearUprightCenterY" },
      { entityId: "profile.base-left", field: "lengthMm", param: "topFrameOuterDepth" },
      { entityId: "profile.base-right", field: "lengthMm", param: "topFrameOuterDepth" },
      { entityId: "profile.base-left", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.base-right", field: "origin.x", param: "rightUprightCenterX" },
    ],
    entities: {
      "profile.top-front": {
        id: "profile.top-front",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 0, y: 20, z: 710 },
        axis: "x",
        lengthMm: 2230,
        rotationAroundAxisDeg: 0,
        purpose: "顶部长跨主梁",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-rear": {
        id: "profile.top-rear",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 0, y: 480, z: 710 },
        axis: "x",
        lengthMm: 2230,
        rotationAroundAxisDeg: 0,
        purpose: "顶部长跨主梁",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-side-left": {
        id: "profile.top-side-left",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 20, y: 40, z: 710 },
        axis: "y",
        lengthMm: 420,
        rotationAroundAxisDeg: 0,
        purpose: "顶部围框侧梁",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-side-right": {
        id: "profile.top-side-right",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 2210, y: 40, z: 710 },
        axis: "y",
        lengthMm: 420,
        rotationAroundAxisDeg: 0,
        purpose: "顶部围框侧梁",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-left-front": {
        id: "profile.upright-left-front",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 20, y: 40, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "立柱",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-left-rear": {
        id: "profile.upright-left-rear",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 20, y: 460, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "立柱",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-right-front": {
        id: "profile.upright-right-front",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 2210, y: 40, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "立柱",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-right-rear": {
        id: "profile.upright-right-rear",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 2210, y: 460, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "立柱",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.base-left": {
        id: "profile.base-left",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 20, y: 0, z: 40 },
        axis: "y",
        lengthMm: 500,
        rotationAroundAxisDeg: 0,
        purpose: "底部侧梁",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.base-right": {
        id: "profile.base-right",
        kind: "profile",
        definitionRef: { partId: definition.id, revision: definition.revision },
        origin: { x: 2210, y: 0, z: 40 },
        axis: "y",
        lengthMm: 500,
        rotationAroundAxisDeg: 0,
        purpose: "底部侧梁",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
    },
    embeddedParts: { [`${definition.id}@${definition.revision}`]: snapshot },
    extensions: {
      notForOrdering: true,
      panelMount: {
        method: "shelf-support-flush-inset",
        panelTopFlushWithFrame: true,
        fitClearancePerSideMm: 2,
        supportConcept: "continuous-inner-ledges-or-shelf-supports",
        measurePanelAfterFrameAssembly: true,
      },
    },
  };
}
