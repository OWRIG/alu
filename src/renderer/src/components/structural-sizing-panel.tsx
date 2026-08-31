import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  Database,
  PackageCheck,
  XCircle,
} from "lucide-react";

import { evaluateParameters } from "../../../domain/params/evaluate";
import { STANDARD_BEAM_CANDIDATES } from "../../../domain/structural/catalog";
import { evaluateStructuralSizing } from "../../../domain/structural/evaluate";
import type { ProfileCompatibilityGroup } from "../../../domain/structural/schema";
import { useI18n, type Translator } from "../i18n/i18n";
import type { MessageKey } from "../i18n/messages";
import { localizeParameterLabel, localizeProfilePurpose } from "../i18n/domain-copy";
import { selectCurrentProject, useProjectStore } from "../store/project-store";
import { NumberField } from "./number-field";

const constructionKeys: Partial<Record<string, MessageKey>> = {
  "flush-inset-panel": "sizing.construction.flushPanel",
  "continuous-main-members": "sizing.construction.continuousMembers",
  "reinforced-load-joints": "sizing.construction.reinforcedJoints",
  "preloaded-connectors-and-side-rails": "sizing.construction.preloadedConnectors",
};

const compatibilityKeys: Partial<Record<ProfileCompatibilityGroup, MessageKey>> = {
  "misumi-jp-series-6": "sizing.compatibility.jp6",
  "misumi-jp-series-8": "sizing.compatibility.jp8",
  "misumi-euro-slot-8": "sizing.compatibility.euro8",
  "jlcfa-euro-30-slot-8": "sizing.compatibility.jlcfaEuro30",
};

function compatibilityLabel(group: ProfileCompatibilityGroup | null, t: Translator) {
  if (group === null) return t("sizing.compatibility.any");
  const key = compatibilityKeys[group];
  return key ? t(key) : group;
}

function calculationSourceLabel(id: string, t: Translator) {
  if (id === "misumi.allowable-load-1") return t("sizing.source.allowableLoad");
  if (id === "misumi.allowable-load-formulas") return t("sizing.source.formulas");
  return id;
}

const COMPATIBILITY_OPTIONS = [
  ...new Set(STANDARD_BEAM_CANDIDATES.map((c) => c.compatibilityGroup)),
];

function CreateStudyForm() {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const createStructuralStudy = useProjectStore((state) => state.createStructuralStudy);

  // Longest members first: those are the ones a span study is usually about.
  const beams = Object.values(project.entities)
    .filter((profile) => profile.axis !== "z")
    .sort((left, right) => right.lengthMm - left.lengthMm);
  const parameterIds = Object.keys(evaluateParameters(project.parameters)).sort((left, right) =>
    left.localeCompare(right, "en"),
  );

  const [beamIds, setBeamIds] = useState<string[]>([]);
  const [spanParam, setSpanParam] = useState("");
  const [heightParam, setHeightParam] = useState("");
  const [group, setGroup] = useState("");

  const ready = beamIds.length > 0 && spanParam !== "" && heightParam !== "";

  return (
    <div className="inspector-scroll">
      <section className="sizing-section" data-testid="sizing-create-form">
        <div className="sizing-section-head">
          <Calculator size={13} />
          <div>
            <strong>{t("sizing.create.title")}</strong>
            <small>{t("sizing.create.help")}</small>
          </div>
        </div>

        {beams.length === 0 && (
          <p className="sizing-inline-note">{t("sizing.create.needsBeams")}</p>
        )}
        {beams.length > 0 && parameterIds.length === 0 && (
          <p className="sizing-inline-note">{t("sizing.create.needsParameters")}</p>
        )}

        {beams.length > 0 && parameterIds.length > 0 && (
          <>
            <div className="study-field">
              <label htmlFor="study-beams">{t("sizing.create.beams")}</label>
              <small>{t("sizing.create.beamsHelp")}</small>
              <div className="study-beam-list" id="study-beams">
                {beams.map((profile) => (
                  <label className="study-beam" key={profile.id}>
                    <input
                      type="checkbox"
                      data-testid={`study-beam-${profile.id}`}
                      checked={beamIds.includes(profile.id)}
                      onChange={(event) =>
                        setBeamIds((current) =>
                          event.target.checked
                            ? [...current, profile.id]
                            : current.filter((id) => id !== profile.id),
                        )
                      }
                    />
                    <span>{localizeProfilePurpose(profile.id, profile.purpose, t)}</span>
                    <small>{formatNumber(profile.lengthMm)} mm</small>
                  </label>
                ))}
              </div>
            </div>

            {(
              [
                [
                  "sizing.create.span",
                  "sizing.create.spanHelp",
                  spanParam,
                  setSpanParam,
                  "study-span",
                ],
                [
                  "sizing.create.maxHeight",
                  "sizing.create.maxHeightHelp",
                  heightParam,
                  setHeightParam,
                  "study-max-height",
                ],
              ] as const
            ).map(([labelKey, helpKey, value, setValue, testId]) => (
              <label className="study-field" key={testId}>
                <span>{t(labelKey)}</span>
                <small>{t(helpKey)}</small>
                <select
                  data-testid={testId}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                >
                  <option value="">{t("parameters.selectParameter")}</option>
                  {parameterIds.map((id) => (
                    <option key={id} value={id}>
                      {localizeParameterLabel(
                        id,
                        project.parameters.inputs[id]?.label ??
                          project.parameters.derived[id]?.label,
                        t,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className="study-field">
              <span>{t("sizing.create.compatibility")}</span>
              <select
                data-testid="study-compatibility"
                value={group}
                onChange={(event) => setGroup(event.target.value)}
              >
                <option value="">{t("sizing.compatibility.any")}</option>
                {COMPATIBILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {compatibilityLabel(option, t)}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="study-submit"
              type="button"
              data-testid="study-create"
              disabled={!ready}
              onClick={() =>
                createStructuralStudy({
                  beamEntityIds: beamIds,
                  effectiveSpanParam: spanParam,
                  maximumSectionHeightParam: heightParam,
                  requiredCompatibilityGroup: group === "" ? null : group,
                })
              }
            >
              <Calculator size={14} /> {t("sizing.create.submit")}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export function StructuralSizingPanel() {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const setStructuralLoads = useProjectStore((state) => state.setStructuralLoads);
  const applyStructuralSelection = useProjectStore((state) => state.applyStructuralSelection);
  const result = evaluateStructuralSizing(project);

  if (!result) return <CreateStudyForm />;

  const { study, selected } = result;
  const selectionApplied = Boolean(
    selected &&
    study.beamEntityIds.every((entityId) => {
      const profile = project.entities[entityId];
      if (!profile) return false;
      const snapshot =
        project.embeddedParts[`${profile.definitionRef.partId}@${profile.definitionRef.revision}`];
      return snapshot?.definition.procurement?.sku === selected.candidate.sku;
    }),
  );
  return (
    <div className="inspector-scroll" data-testid="structural-sizing-panel">
      <div className="inspector-section-bar">
        <span>{t("sizing.candidates", { count: result.candidates.length })}</span>
        <span className={selected ? "good" : "bad"}>
          {selected ? t("sizing.resultFound") : t("sizing.noResult")}
        </span>
      </div>

      <section className={`sizing-hero${selected ? " is-pass" : " is-fail"}`}>
        <div className="sizing-hero-title">
          {selected ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
          <div>
            <span>{t("sizing.recommendation")}</span>
            <strong data-testid="sizing-selected-sku">
              {selected?.candidate.sku ?? t("sizing.none")}
            </strong>
          </div>
        </div>
        {selected && (
          <>
            <p>{t("sizing.selectionReason", { count: result.candidates.length })}</p>
            <ul className="sizing-reason">
              <li>
                {t("sizing.reason.deflection", {
                  value: formatNumber(selected.deflectionMm, 2),
                  limit: formatNumber(selected.deflectionLimitMm, 2),
                })}
              </li>
              <li>
                {t("sizing.reason.height", {
                  value: formatNumber(selected.candidate.sectionHeightMm, 0),
                  limit: formatNumber(result.maximumSectionHeightMm, 0),
                })}
              </li>
              <li>
                {t("sizing.reason.system", {
                  system: compatibilityLabel(study.requiredCompatibilityGroup, t),
                })}
              </li>
            </ul>
          </>
        )}
        {selected && (
          <button
            className={`sizing-apply${selectionApplied ? " is-applied" : ""}`}
            type="button"
            data-testid="sizing-apply-selection"
            disabled={selectionApplied}
            onClick={applyStructuralSelection}
          >
            <PackageCheck size={14} />
            <span>
              <strong>
                {selectionApplied ? t("sizing.selectionApplied") : t("sizing.applySelection")}
              </strong>
              <small>
                {selectionApplied
                  ? t("sizing.selectionAppliedHelp")
                  : t("sizing.applySelectionHelp")}
              </small>
            </span>
          </button>
        )}
        <div className="sizing-metrics">
          <div>
            <span>{t("sizing.metric.deflection")}</span>
            <strong data-testid="sizing-selected-deflection">
              {selected ? formatNumber(selected.deflectionMm, 2) : "—"}
              <small> mm</small>
            </strong>
          </div>
          <div>
            <span>{t("sizing.metric.limit")}</span>
            <strong>
              {formatNumber(result.effectiveSpanMm / study.deflectionLimitRatio, 2)}
              <small> mm</small>
            </strong>
          </div>
          <div>
            <span>{t("sizing.metric.beamMass")}</span>
            <strong>
              {selected ? formatNumber(selected.beamSetMassKg, 2) : "—"}
              <small> kg</small>
            </strong>
          </div>
        </div>
      </section>

      <section className="sizing-section">
        <div className="sizing-section-head">
          <Calculator size={13} />
          <div>
            <strong>{t("sizing.loads.title")}</strong>
            <small>{t("sizing.loads.help")}</small>
          </div>
        </div>
        <div className="sizing-input-row">
          <div>
            <label htmlFor="sizing-panel-mass">{t("sizing.loads.panelMass")}</label>
            <small>{t("sizing.loads.panelMassHelp")}</small>
          </div>
          <NumberField
            value={study.loads.panelMassKg}
            onCommit={(panelMassKg) => setStructuralLoads({ panelMassKg })}
            min={0}
            step={1}
            suffix="kg"
            testId="sizing-panel-mass"
            ariaLabel={t("sizing.loads.panelMass")}
            compact
          />
        </div>
        <div className="sizing-input-row">
          <div>
            <label htmlFor="sizing-distributed-payload">
              {t("sizing.loads.distributedPayload")}
            </label>
            <small>{t("sizing.loads.distributedPayloadHelp")}</small>
          </div>
          <NumberField
            value={study.loads.distributedPayloadKg}
            onCommit={(distributedPayloadKg) => setStructuralLoads({ distributedPayloadKg })}
            min={0}
            step={1}
            suffix="kg"
            testId="sizing-distributed-payload"
            ariaLabel={t("sizing.loads.distributedPayload")}
            compact
          />
        </div>
        <div className="sizing-input-row">
          <div>
            <label htmlFor="sizing-center-payload">{t("sizing.loads.centerPayload")}</label>
            <small>{t("sizing.loads.centerPayloadHelp")}</small>
          </div>
          <NumberField
            value={study.loads.centerPointPayloadKg}
            onCommit={(centerPointPayloadKg) => setStructuralLoads({ centerPointPayloadKg })}
            min={0}
            step={1}
            suffix="kg"
            testId="sizing-center-payload"
            ariaLabel={t("sizing.loads.centerPayload")}
            compact
          />
        </div>
      </section>

      <section className="sizing-section">
        <div className="sizing-section-head">
          <Database size={13} />
          <div>
            <strong>{t("sizing.model.title")}</strong>
            <small>{t("sizing.model.help")}</small>
          </div>
        </div>
        <div className="sizing-facts">
          <div>
            <span>{t("sizing.model.span")}</span>
            <strong>{formatNumber(result.effectiveSpanMm, 0)} mm</strong>
          </div>
          <div>
            <span>{t("sizing.model.beams")}</span>
            <strong>{study.beamCount}</strong>
          </div>
          <div>
            <span>{t("sizing.model.udlShare")}</span>
            <strong>{formatNumber(study.loads.distributedLoadSharePerBeam * 100, 0)}%</strong>
          </div>
          <div>
            <span>{t("sizing.model.pointShare")}</span>
            <strong>{formatNumber(study.loads.centerPointLoadSharePerBeam * 100, 0)}%</strong>
          </div>
          <div>
            <span>{t("sizing.model.modulus")}</span>
            <strong>{formatNumber(study.elasticModulusNPerMm2, 0)} N/mm²</strong>
          </div>
          <div>
            <span>{t("sizing.model.criterion")}</span>
            <strong>L/{formatNumber(study.deflectionLimitRatio, 0)}</strong>
          </div>
          <div>
            <span>{t("sizing.model.maxHeight")}</span>
            <strong>{formatNumber(result.maximumSectionHeightMm, 0)} mm</strong>
          </div>
          <div>
            <span>{t("sizing.model.compatibility")}</span>
            <strong>{compatibilityLabel(study.requiredCompatibilityGroup, t)}</strong>
          </div>
        </div>
        <div className="sizing-formulas" aria-label={t("sizing.formulas")}>
          <code>
            δ<sub>udl</sub> = 5wL⁴ / 384EI
          </code>
          <code>
            δ<sub>point</sub> = PL³ / 48EI
          </code>
          <code>
            M<sub>max</sub> = wL² / 8 + PL / 4
          </code>
        </div>
      </section>

      <section className="sizing-section" data-testid="sizing-candidate-comparison">
        <div className="sizing-section-head">
          <Database size={13} />
          <div>
            <strong>{t("sizing.compare.title")}</strong>
            <small>{t("sizing.compare.help")}</small>
          </div>
        </div>
        <div className="sizing-candidate-head">
          <span>{t("sizing.compare.profile")}</span>
          <span>{t("sizing.compare.deflection")}</span>
          <span>{t("sizing.compare.status")}</span>
        </div>
        {result.candidates.map((candidate) => {
          const constrained = !candidate.fitsSectionHeight || !candidate.fitsCompatibilityGroup;
          const statuses = [
            {
              label: candidate.passesDeflection ? t("sizing.pass") : t("sizing.fail"),
              tone: candidate.passesDeflection ? (constrained ? "" : "good") : "bad",
            },
            ...(!candidate.fitsSectionHeight
              ? [{ label: t("sizing.tooTall"), tone: "constraint" }]
              : []),
            ...(!candidate.fitsCompatibilityGroup
              ? [{ label: t("sizing.incompatible"), tone: "constraint" }]
              : []),
          ];
          return (
            <div
              className={`sizing-candidate${
                candidate.candidate.id === selected?.candidate.id ? " is-selected" : ""
              }${constrained ? " is-constrained" : ""}`}
              data-testid={`sizing-candidate-${candidate.candidate.sku}`}
              key={candidate.candidate.id}
            >
              <div>
                <strong>{candidate.candidate.sku}</strong>
                <span>I = {formatNumber(candidate.candidate.inertiaMm4 / 1e4, 2)} × 10⁴ mm⁴</span>
                <small>
                  {formatNumber(candidate.candidate.massKgPerM, 2)} kg/m ·{" "}
                  {candidate.candidate.sectionWidthMm} × {candidate.candidate.sectionHeightMm} mm
                </small>
                <small>{compatibilityLabel(candidate.candidate.compatibilityGroup, t)}</small>
              </div>
              <span>{formatNumber(candidate.deflectionMm, 2)} mm</span>
              <div className="sizing-candidate-status">
                {statuses.map((status) => (
                  <span className={status.tone} key={`${candidate.candidate.id}-${status.label}`}>
                    {status.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {selected && (
        <section className="sizing-section">
          <div className="sizing-section-head">
            <Calculator size={13} />
            <div>
              <strong>{t("sizing.derivation.title")}</strong>
              <small>{selected.candidate.sku}</small>
            </div>
          </div>
          <div className="sizing-derivation">
            <div>
              <span>{t("sizing.derivation.panel")}</span>
              <strong>{formatNumber(selected.deflectionPartsMm.panel, 3)} mm</strong>
            </div>
            <div>
              <span>{t("sizing.derivation.distributed")}</span>
              <strong>{formatNumber(selected.deflectionPartsMm.distributedPayload, 3)} mm</strong>
            </div>
            <div>
              <span>{t("sizing.derivation.self")}</span>
              <strong>{formatNumber(selected.deflectionPartsMm.beamSelfWeight, 3)} mm</strong>
            </div>
            <div>
              <span>{t("sizing.derivation.point")}</span>
              <strong>{formatNumber(selected.deflectionPartsMm.centerPointPayload, 3)} mm</strong>
            </div>
            <div>
              <span>{t("sizing.derivation.stress")}</span>
              <strong>{formatNumber(selected.bendingStressNPerMm2, 1)} N/mm²</strong>
            </div>
            <div>
              <span>{t("sizing.derivation.pointLimit")}</span>
              <strong>{formatNumber(selected.centerPointMassLimitKgUnderBaseLoad, 1)} kg</strong>
            </div>
          </div>
          <p className="sizing-inline-note">{t("sizing.derivation.pointLimitHelp")}</p>
        </section>
      )}

      <section className="sizing-section">
        <div className="sizing-section-head">
          <BookOpen size={13} />
          <div>
            <strong>{t("sizing.evidence.title")}</strong>
            <small>{t("sizing.evidence.help")}</small>
          </div>
        </div>
        <div className="sizing-evidence-list">
          {study.candidates.map((candidate) => (
            <div key={candidate.id}>
              <span>{t("sizing.evidence.vendor")}</span>
              <strong>{t("sizing.source.profileCatalog", { sku: candidate.sku })}</strong>
              <small>
                {candidate.source.catalogPage} · I = {formatNumber(candidate.inertiaMm4 / 1e4, 2)}
                {" × 10⁴ mm⁴"}
              </small>
            </div>
          ))}
          {study.calculationSources.map((source) => (
            <div key={source.id}>
              <span>{t("sizing.evidence.vendor")}</span>
              <strong>{calculationSourceLabel(source.id, t)}</strong>
              <small>{source.id}</small>
            </div>
          ))}
          {study.constructionEvidence.map((evidence) => {
            const constructionKey = constructionKeys[evidence.id];
            return (
              <div key={evidence.id}>
                <span>{t("sizing.evidence.field")}</span>
                <strong>
                  {constructionKey ? t(constructionKey) : (evidence.title ?? evidence.id)}
                </strong>
                <small>
                  {evidence.platform ?? t("sizing.evidence.external")}
                  {evidence.noteId ? ` · ${evidence.noteId}` : ""}
                </small>
              </div>
            );
          })}
        </div>
      </section>

      <div className="sizing-boundary">
        <AlertTriangle size={15} />
        <div>
          <strong>{t("sizing.boundary.title")}</strong>
          <span>{t("sizing.boundary.body")}</span>
          <details data-testid="sizing-boundary-details">
            <summary>{t("sizing.boundary.expand")}</summary>
            <p>{t("sizing.boundary.details")}</p>
          </details>
        </div>
      </div>
    </div>
  );
}
