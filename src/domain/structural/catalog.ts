import { StructuralSizingStudySchema, type BeamCandidate } from "./schema";

const MISUMI_3030_SOURCE = "https://www.misumi.com.cn/pdf/fa/2018/p2127.pdf";
const MISUMI_4040_SOURCE = "https://www.misumi.com.cn/pdf/fa/2018/p2137.pdf";
const MISUMI_4080_SOURCE = "https://www.misumi.com.cn/pdf/fa/2018/p2139.pdf";
const MISUMI_EURO_30_SOURCE = "https://www.misumi.com.cn/pdf/vona/P3_202005_04.pdf";
const JLCFA_EURO_30_SOURCE = "https://static.jlcfa.com/Serial/T01/TXCK/482732153849024513.pdf";

export const STANDARD_BEAM_CANDIDATES: BeamCandidate[] = [
  {
    id: "jlcfa.txck-h6-j3030",
    vendor: "JLCFA",
    sku: "TXCK-H6-J3030",
    material: "A6063-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 30,
    massKgPerM: 0.77,
    inertiaMm4: 2.618e4,
    orientation: "symmetric",
    compatibilityGroup: "jlcfa-euro-30-slot-8",
    source: {
      title: "JLCFA Euro 30-series TXCK profile catalog",
      url: JLCFA_EURO_30_SOURCE,
      catalogPage: "PDF p.4, J3030 row",
    },
  },
  {
    id: "jlcfa.txck-h6-j3060",
    vendor: "JLCFA",
    sku: "TXCK-H6-J3060",
    material: "A6063-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 60,
    massKgPerM: 1.37,
    inertiaMm4: 17.944e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "jlcfa-euro-30-slot-8",
    source: {
      title: "JLCFA Euro 30-series TXCK profile catalog",
      url: JLCFA_EURO_30_SOURCE,
      catalogPage: "PDF p.4, J3060 row",
    },
  },
  {
    id: "jlcfa.txck-h6-j3090",
    vendor: "JLCFA",
    sku: "TXCK-H6-J3090",
    material: "A6063-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 90,
    massKgPerM: 1.97,
    inertiaMm4: 55.694e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "jlcfa-euro-30-slot-8",
    source: {
      title: "JLCFA Euro 30-series TXCK profile catalog",
      url: JLCFA_EURO_30_SOURCE,
      catalogPage: "PDF p.4, J3090 row",
    },
  },
  {
    id: "jlcfa.txck-h6-3090",
    vendor: "JLCFA",
    sku: "TXCK-H6-3090",
    material: "A6063-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 90,
    massKgPerM: 2.19,
    inertiaMm4: 61.01e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "jlcfa-euro-30-slot-8",
    source: {
      title: "JLCFA Euro 30-series TXCK profile catalog",
      url: JLCFA_EURO_30_SOURCE,
      catalogPage: "PDF p.4, 3090 row",
    },
  },
  {
    id: "misumi.nefs6-3030",
    vendor: "MISUMI",
    sku: "NEFS6-3030",
    material: "A6063S-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 30,
    massKgPerM: 0.8,
    inertiaMm4: 2.85e4,
    orientation: "symmetric",
    compatibilityGroup: "misumi-jp-series-6",
    source: {
      title: "MISUMI 30 mm aluminum frame catalog",
      url: MISUMI_3030_SOURCE,
      catalogPage: "FA 2018 p.2127",
    },
  },
  {
    id: "misumi.nefs8-4040",
    vendor: "MISUMI",
    sku: "NEFS8-4040",
    material: "A6063S-T5",
    sectionWidthMm: 40,
    sectionHeightMm: 40,
    massKgPerM: 1.61,
    inertiaMm4: 10.5e4,
    orientation: "symmetric",
    compatibilityGroup: "misumi-jp-series-8",
    source: {
      title: "MISUMI 40 mm aluminum frame catalog",
      url: MISUMI_4040_SOURCE,
      catalogPage: "FA 2018 p.2137",
    },
  },
  {
    id: "misumi.lcf8-3060",
    vendor: "MISUMI",
    sku: "LCF8-3060",
    material: "6063-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 60,
    massKgPerM: 1.42,
    inertiaMm4: 19.8e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "misumi-euro-slot-8",
    source: {
      title: "MISUMI Euro 30-series aluminum frame catalog",
      url: MISUMI_EURO_30_SOURCE,
      catalogPage: "P3 2020-05 p.3",
    },
  },
  {
    id: "misumi.lcf8-3090",
    vendor: "MISUMI",
    sku: "LCF8-3090",
    material: "6063-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 90,
    massKgPerM: 2.04,
    inertiaMm4: 61.18e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "misumi-euro-slot-8",
    source: {
      title: "MISUMI Euro 30-series aluminum frame catalog",
      url: MISUMI_EURO_30_SOURCE,
      catalogPage: "P3 2020-05 p.3",
    },
  },
  {
    id: "misumi.lcf8-30120",
    vendor: "MISUMI",
    sku: "LCF8-30120",
    material: "6063-T5",
    sectionWidthMm: 30,
    sectionHeightMm: 120,
    massKgPerM: 2.69,
    inertiaMm4: 136.88e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "misumi-euro-slot-8",
    source: {
      title: "MISUMI Euro 30-series aluminum frame catalog",
      url: MISUMI_EURO_30_SOURCE,
      catalogPage: "P3 2020-05 p.3",
    },
  },
  {
    id: "misumi.nfsl8-4080",
    vendor: "MISUMI",
    sku: "NFSL8-4080",
    material: "A6063S-T5",
    sectionWidthMm: 40,
    sectionHeightMm: 80,
    massKgPerM: 2.12,
    inertiaMm4: 52.9e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "misumi-jp-series-8",
    source: {
      title: "MISUMI 40 × 80 mm aluminum frame catalog",
      url: MISUMI_4080_SOURCE,
      catalogPage: "FA 2018 p.2139",
    },
  },
  {
    id: "misumi.nefs8-4080",
    vendor: "MISUMI",
    sku: "NEFS8-4080",
    material: "A6063S-T5",
    sectionWidthMm: 40,
    sectionHeightMm: 80,
    massKgPerM: 2.79,
    inertiaMm4: 72.6e4,
    orientation: "strong-axis-vertical",
    compatibilityGroup: "misumi-jp-series-8",
    source: {
      title: "MISUMI 40 × 80 mm aluminum frame catalog",
      url: MISUMI_4080_SOURCE,
      catalogPage: "FA 2018 p.2139",
    },
  },
];

export const STANDARD_CALCULATION_SOURCES = [
  {
    id: "misumi.allowable-load-1",
    title: "MISUMI allowable-load calculation and L/1000 criterion",
    url: "https://cn.c.misumi.com.cn/book/sh2_2018_msm_fa_01/pdf/2146.pdf",
  },
  {
    id: "misumi.allowable-load-formulas",
    title: "MISUMI simply supported beam formulas and elastic modulus",
    url: "https://cn.c.misumi.com.cn/book/sh2_2018_msm_fa_01/pdf/2147.pdf",
  },
] as const;

export const STANDARD_ASSUMPTION_IDS = [
  "ideal-simply-supported",
  "linear-elastic",
  "no-panel-composite-action",
  "connections-excluded",
] as const;

export type StructuralSizingStudyInput = {
  beamEntityIds: string[];
  effectiveSpanParam: string;
  maximumSectionHeightParam: string;
  requiredCompatibilityGroup: string | null;
};

/**
 * Builds a study from the four decisions a user has to make. Everything else —
 * candidate catalog, gravity, elastic modulus, deflection criterion and load
 * shares — comes from the shared standard set so the command stays small.
 * Loads start at zero and are edited afterwards in the sizing panel.
 */
export function createStructuralSizingStudy(input: StructuralSizingStudyInput) {
  return StructuralSizingStudySchema.parse({
    version: 1,
    scope: "user-defined-main-beams",
    beamEntityIds: input.beamEntityIds,
    effectiveSpanParam: input.effectiveSpanParam,
    maximumSectionHeightParam: input.maximumSectionHeightParam,
    requiredCompatibilityGroup: input.requiredCompatibilityGroup,
    beamCount: input.beamEntityIds.length,
    gravityNPerKg: 9.80665,
    elasticModulusNPerMm2: 69_972,
    deflectionLimitRatio: 1_000,
    loads: {
      panelMassKg: 0,
      distributedPayloadKg: 0,
      centerPointPayloadKg: 0,
      distributedLoadSharePerBeam: 1 / input.beamEntityIds.length,
      centerPointLoadSharePerBeam: 1,
    },
    candidates: STANDARD_BEAM_CANDIDATES,
    assumptionIds: [...STANDARD_ASSUMPTION_IDS],
    calculationSources: STANDARD_CALCULATION_SOURCES.map((source) => ({ ...source })),
    constructionEvidence: [],
  });
}

export function createDemoStructuralSizingStudy() {
  return StructuralSizingStudySchema.parse({
    version: 1,
    scope: "twin-longitudinal-top-beams",
    beamEntityIds: ["profile.top-front", "profile.top-rear"],
    effectiveSpanParam: "topBeamEffectiveSpan",
    maximumSectionHeightParam: "topBeamMaximumHeight",
    appliedSectionWidthParam: "topBeamWidth",
    appliedSectionHeightParam: "topFrameHeight",
    requiredCompatibilityGroup: "jlcfa-euro-30-slot-8",
    beamCount: 2,
    gravityNPerKg: 9.80665,
    elasticModulusNPerMm2: 69_972,
    deflectionLimitRatio: 1_000,
    loads: {
      panelMassKg: 12,
      distributedPayloadKg: 15,
      centerPointPayloadKg: 10,
      distributedLoadSharePerBeam: 0.5,
      centerPointLoadSharePerBeam: 1,
    },
    candidates: STANDARD_BEAM_CANDIDATES,
    assumptionIds: [...STANDARD_ASSUMPTION_IDS],
    calculationSources: STANDARD_CALCULATION_SOURCES.map((source) => ({ ...source })),
    constructionEvidence: [
      {
        id: "flush-inset-panel",
        platform: "xiaohongshu",
        noteId: "6879d1ea0000000011001330",
        url: "https://www.xiaohongshu.com/explore/6879d1ea0000000011001330",
      },
      {
        id: "continuous-main-members",
        platform: "xiaohongshu",
        noteId: "69f2ab49000000001e00e55b",
        url: "https://www.xiaohongshu.com/explore/69f2ab49000000001e00e55b",
      },
      {
        id: "reinforced-load-joints",
        platform: "xiaohongshu",
        noteId: "6a0eefda000000000802760c",
        url: "https://www.xiaohongshu.com/explore/6a0eefda000000000802760c",
      },
      {
        id: "preloaded-connectors-and-side-rails",
        platform: "xiaohongshu",
        noteId: "6a2150160000000006032e93",
        url: "https://www.xiaohongshu.com/explore/6a2150160000000006032e93",
      },
    ],
  });
}
