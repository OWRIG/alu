import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Drill,
  ClipboardList,
  Link2,
  Plus,
  PanelRightClose,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Calculator,
  Trash2,
  Unlink2,
} from "lucide-react";

import { deriveProfileBom } from "../../../domain/bom/derive";
import { deriveHardware, deriveMachining } from "../../../domain/joints/machining";
import type { HardwareItem, MachiningOp } from "../../../domain/joints/schema";
import { GENERIC_PROFILE_DEFINITIONS } from "../../../domain/project/defaults";
import { evaluateParameters } from "../../../domain/params/evaluate";
import { partKey } from "../../../domain/project/parse";
import { evaluateRules, type RuleFinding } from "../../../domain/rules/evaluate";
import type { ProfileInstance } from "../../../domain/project/schema";
import {
  localizeConfidence,
  localizeDefinitionName,
  localizeEvidenceKind,
  localizeFinding,
  localizeParameterLabel,
  localizeProfilePurpose,
} from "../i18n/domain-copy";
import { useI18n } from "../i18n/i18n";
import type { Translator } from "../i18n/i18n";
import type { MessageKey } from "../i18n/messages";
import { useLayoutStore } from "../store/layout-store";
import { selectCurrentProject, useProjectStore } from "../store/project-store";
import { NumberField } from "./number-field";
import { JointsPanel } from "./joints-panel";
import { StructuralSizingPanel } from "./structural-sizing-panel";

type InspectorTab = "profiles" | "joints" | "bom" | "sizing" | "rules";

function ProfileList() {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const selectedEntityId = useProjectStore((state) => state.selectedEntityId);
  const selectEntity = useProjectStore((state) => state.selectEntity);
  const addProfile = useProjectStore((state) => state.addProfile);
  const profiles = Object.values(project.entities).sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  );

  return (
    <>
      <div className="inspector-section-bar">
        <span>{t("profiles.count", { count: profiles.length })}</span>
        <button data-testid="add-profile" type="button" onClick={addProfile}>
          <Plus size={13} /> {t("profiles.add")}
        </button>
      </div>
      <div className="entity-list">
        {profiles.map((profile) => {
          const definition =
            project.embeddedParts[
              partKey(profile.definitionRef.partId, profile.definitionRef.revision)
            ]?.definition;
          return (
            <button
              className={
                profile.id === selectedEntityId ? "entity-card is-selected" : "entity-card"
              }
              data-testid={`profile-card-${profile.id}`}
              key={profile.id}
              type="button"
              onClick={() => selectEntity(profile.id)}
            >
              <span className="entity-axis">{profile.axis.toUpperCase()}</span>
              <span className="entity-copy">
                <strong>{localizeProfilePurpose(profile.id, profile.purpose, t)}</strong>
                <small>
                  {definition
                    ? localizeDefinitionName(profile.definitionRef.partId, definition.name, t)
                    : profile.definitionRef.partId}
                </small>
              </span>
              <span className="entity-length">{formatNumber(profile.lengthMm)} mm</span>
            </button>
          );
        })}
        {profiles.length === 0 && (
          <div className="empty-state empty-state--compact">
            <Boxes size={22} />
            <p>{t("profiles.empty")}</p>
          </div>
        )}
      </div>
      {selectedEntityId && project.entities[selectedEntityId] && (
        <ProfileEditor profile={project.entities[selectedEntityId]} />
      )}
    </>
  );
}

function ProfileEditor({ profile }: { profile: ProfileInstance }) {
  const { locale, t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const updateProfile = useProjectStore((state) => state.updateProfile);
  const removeEntity = useProjectStore((state) => state.removeEntity);
  const setBinding = useProjectStore((state) => state.setBinding);
  const removeBinding = useProjectStore((state) => state.removeBinding);
  const resyncBinding = useProjectStore((state) => state.resyncBinding);
  const setProfileDefinition = useProjectStore((state) => state.setProfileDefinition);
  const displayedPurpose = localizeProfilePurpose(profile.id, profile.purpose, t);
  const [purpose, setPurpose] = useState(displayedPurpose);
  const values = evaluateParameters(project.parameters);
  const lengthBinding = project.bindings.find(
    (binding) => binding.entityId === profile.id && binding.field === "lengthMm",
  );
  const expectedLength = lengthBinding ? values[lengthBinding.param] : undefined;
  const stale = expectedLength !== undefined && Math.abs(profile.lengthMm - expectedLength) > 0.005;
  // Built-in concept envelopes plus every definition this project already carries,
  // so an applied vendor SKU stays selectable after the sizing study wrote it in.
  const definitionOptions = (() => {
    const byId = new Map<string, string>();
    for (const generic of GENERIC_PROFILE_DEFINITIONS) {
      byId.set(
        generic.id,
        `${localizeDefinitionName(generic.id, generic.name, t)} · ${t("definition.sectionSuffix", {
          u: generic.section.envelopeUMm,
          v: generic.section.envelopeVMm,
        })}`,
      );
    }
    for (const snapshot of Object.values(project.embeddedParts)) {
      const embedded = snapshot.definition;
      byId.set(
        embedded.id,
        `${localizeDefinitionName(embedded.id, embedded.name, t)} · ${t(
          "definition.sectionSuffix",
          { u: embedded.section.envelopeUMm, v: embedded.section.envelopeVMm },
        )}`,
      );
    }
    return [...byId].map(([id, label]) => ({ id, label }));
  })();

  useEffect(() => setPurpose(displayedPurpose), [displayedPurpose, locale, profile.id]);

  function updateOrigin(axis: "x" | "y" | "z", value: number) {
    updateProfile(profile.id, { origin: { ...profile.origin, [axis]: value } });
  }

  return (
    <section className="property-editor" data-testid="profile-editor">
      <div className="property-editor-title">
        <div>
          <span>{t("profile.properties")}</span>
          <small>{profile.id}</small>
        </div>
        <button
          className="danger-icon-button"
          type="button"
          aria-label={t("profile.delete")}
          title={t("profile.delete")}
          onClick={() => removeEntity(profile.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <label className="property-field">
        <span>{t("profile.purpose")}</span>
        <input
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          onBlur={() => {
            const next = purpose.trim();
            if (next && next !== displayedPurpose) updateProfile(profile.id, { purpose: next });
            else setPurpose(displayedPurpose);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>

      <label className="select-field">
        <span>{t("profile.definition")}</span>
        <select
          data-testid="profile-definition"
          aria-label={t("profile.changeDefinition")}
          value={profile.definitionRef.partId}
          onChange={(event) => setProfileDefinition(profile.id, event.target.value)}
        >
          {definitionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="property-grid property-grid--two">
        <label className="select-field">
          <span>{t("profile.axis")}</span>
          <select
            data-testid="profile-axis"
            value={profile.axis}
            onChange={(event) =>
              updateProfile(profile.id, { axis: event.target.value as "x" | "y" | "z" })
            }
          >
            <option value="x">X</option>
            <option value="y">Y</option>
            <option value="z">Z</option>
          </select>
        </label>
        <label className="select-field">
          <span>{t("profile.orientation")}</span>
          <select
            data-testid="profile-rotation"
            value={profile.rotationAroundAxisDeg}
            onChange={(event) =>
              updateProfile(profile.id, {
                rotationAroundAxisDeg: Number(event.target.value) as 0 | 90 | 180 | 270,
              })
            }
          >
            {[0, 90, 180, 270].map((angle) => (
              <option key={angle} value={angle}>
                {angle}°
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="property-field">
        <span>{t("profile.length")}</span>
        <NumberField
          value={profile.lengthMm}
          min={0.01}
          onCommit={(lengthMm) => updateProfile(profile.id, { lengthMm })}
          testId="profile-length"
          ariaLabel={t("profile.lengthAria")}
        />
      </div>

      <div className="property-grid property-grid--three">
        {(["x", "y", "z"] as const).map((axis) => (
          <div className="property-field property-field--stacked" key={axis}>
            <span>{t("profile.origin", { axis: axis.toUpperCase() })}</span>
            <NumberField
              value={profile.origin[axis]}
              onCommit={(value) => updateOrigin(axis, value)}
              suffix=""
              compact
              ariaLabel={t("profile.origin", { axis: axis.toUpperCase() })}
            />
          </div>
        ))}
      </div>

      <div className="binding-box">
        <div className="binding-heading">
          <span>
            <Link2 size={12} /> {t("binding.title")}
          </span>
          {lengthBinding && (
            <button
              type="button"
              title={t("binding.unlink")}
              aria-label={t("binding.unlink")}
              onClick={() => removeBinding(profile.id, "lengthMm")}
            >
              <Unlink2 size={13} />
            </button>
          )}
        </div>
        <select
          value={lengthBinding?.param ?? ""}
          onChange={(event) => {
            if (event.target.value) setBinding(profile.id, "lengthMm", event.target.value);
            else if (lengthBinding) removeBinding(profile.id, "lengthMm");
          }}
        >
          <option value="">{t("binding.none")}</option>
          {Object.entries(values).map(([id, value]) => (
            <option key={id} value={id}>
              {localizeParameterLabel(
                id,
                project.parameters.inputs[id]?.label ?? project.parameters.derived[id]?.label ?? id,
                t,
              )}{" "}
              · {value} mm
            </option>
          ))}
        </select>
        {stale && (
          <div className="binding-stale" data-testid="binding-stale">
            <AlertTriangle size={13} />
            <span>
              {t("binding.stale", {
                parameter: localizeParameterLabel(
                  lengthBinding?.param ?? "",
                  lengthBinding?.param,
                  t,
                ),
              })}
            </span>
            <button type="button" onClick={() => resyncBinding(profile.id, "lengthMm")}>
              <RefreshCw size={12} /> {t("binding.resync")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function BomPanel() {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const bomDrift = useProjectStore((state) => state.bomDrift);
  const bom = deriveProfileBom(project);

  return (
    <div className="inspector-scroll">
      <div className="inspector-section-bar">
        <span>{t("cutList.groups", { count: bom.lines.length })}</span>
        <code>{bom.bomHash.slice(0, 8)}</code>
      </div>
      {bomDrift && (
        <div className="bom-drift" data-testid="bom-drift">
          <RefreshCw size={13} /> {t("cutList.recomputed")}
        </div>
      )}
      <div data-testid="bom-table">
        <div className="bom-table-head">
          <span>{t("cutList.specPurpose")}</span>
          <span>{t("cutList.length")}</span>
          <span>{t("cutList.quantity")}</span>
        </div>
        {bom.lines.map((line) => (
          <div className="bom-row" key={line.aggregateKey}>
            <div>
              <strong>
                {localizeDefinitionName(line.definitionRef.partId, line.definitionName, t)}
              </strong>
              <span>{localizeProfilePurpose(line.sourceEntityIds[0] ?? "", line.purpose, t)}</span>
              <small>{line.sourceEntityIds.join(" · ")}</small>
            </div>
            <span data-testid={`bom-length-${line.lengthMm}`}>
              {formatNumber(line.lengthMm)} mm
            </span>
            <strong>× {line.quantity}</strong>
          </div>
        ))}
        {bom.lines.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={24} />
            <p>{t("cutList.empty")}</p>
          </div>
        )}
      </div>
      <HardwareSection />
      <MachiningSection ops={deriveMachining(project)} />
    </div>
  );
}

const hardwareKeys: Record<HardwareItem, MessageKey> = {
  "corner-bracket": "hardware.cornerBracket",
  "hidden-connector": "hardware.hiddenConnector",
  "t-nut": "hardware.tNut",
  bolt: "hardware.bolt",
};

function MachiningSection({ ops }: { ops: MachiningOp[] }) {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const byEntity = new Map<string, MachiningOp[]>();
  for (const op of ops) {
    byEntity.set(op.entityId, [...(byEntity.get(op.entityId) ?? []), op]);
  }

  return (
    <section data-testid="machining-list">
      <div className="inspector-section-bar">
        <span>
          <Drill size={13} /> {t("machining.title")}
        </span>
        <span>{t("machining.count", { count: ops.length })}</span>
      </div>
      {ops.length === 0 && <p className="sizing-inline-note">{t("machining.none")}</p>}
      {[...byEntity.entries()].map(([entityId, entityOps]) => {
        const profile = project.entities[entityId];
        return (
          <div className="machining-group" key={entityId}>
            <strong>
              {profile ? localizeProfilePurpose(profile.id, profile.purpose, t) : entityId}
            </strong>
            {entityOps.map((op, index) => (
              <div className="machining-row" key={`${entityId}-${index}`}>
                <span className={op.kind === "tap" ? "machining-tap" : "machining-through"}>
                  {op.kind === "tap" ? t("machining.tap") : t("machining.throughHole")}
                </span>
                <span className="machining-spec">
                  Ø{formatNumber(op.diameterMm, 1)}
                  {op.depthMm === null
                    ? ` · ${t("machining.depthThrough")}`
                    : ` · ${formatNumber(op.depthMm, 0)} mm`}
                </span>
                <span className="machining-face">{op.face}</span>
                <small>
                  {t("machining.fromEndA", { value: formatNumber(op.offsetFromEndAMm) })}
                </small>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function HardwareSection() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const lines = deriveHardware(project);

  return (
    <section data-testid="hardware-list">
      <div className="inspector-section-bar">
        <span>
          <Link2 size={13} /> {t("hardware.title")}
        </span>
        <span>{t("hardware.count", { count: lines.length })}</span>
      </div>
      {lines.length === 0 && <p className="sizing-inline-note">{t("hardware.empty")}</p>}
      {lines.map((line) => (
        <div className="hardware-row" data-testid={`hardware-${line.item}`} key={line.aggregateKey}>
          <div>
            <strong>{t(hardwareKeys[line.item])}</strong>
            <span>{line.specification}</span>
            <small>{t("hardware.skuPending")}</small>
          </div>
          <strong>× {line.quantity}</strong>
        </div>
      ))}
    </section>
  );
}

function severityLabel(finding: RuleFinding, t: Translator) {
  if (finding.severity === "error") return t("checks.error");
  if (finding.severity === "warning") return t("checks.review");
  return t("checks.info");
}

function ContextEditor() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const setProjectContext = useProjectStore((state) => state.setProjectContext);
  const context = project.context;

  return (
    <section className="context-editor" data-testid="context-editor">
      <div className="context-head">
        <SlidersHorizontal size={13} />
        <div>
          <strong>{t("context.title")}</strong>
          <small>{t("context.help")}</small>
        </div>
      </div>
      <label className="select-field">
        <span>{t("context.mobility")}</span>
        <select
          data-testid="context-mobility"
          value={context.mobility}
          onChange={(event) =>
            setProjectContext({
              mobility: event.target.value as typeof context.mobility,
            })
          }
        >
          <option value="unknown">{t("context.mobility.unknown")}</option>
          <option value="static">{t("context.mobility.static")}</option>
          <option value="casters">{t("context.mobility.casters")}</option>
        </select>
      </label>
      <label className="select-field">
        <span>{t("context.floor")}</span>
        <select
          data-testid="context-floor"
          value={context.floor}
          onChange={(event) =>
            setProjectContext({ floor: event.target.value as typeof context.floor })
          }
        >
          <option value="unknown">{t("context.floor.unknown")}</option>
          <option value="wood">{t("context.floor.wood")}</option>
          <option value="tile">{t("context.floor.tile")}</option>
          <option value="carpet">{t("context.floor.carpet")}</option>
          <option value="concrete">{t("context.floor.concrete")}</option>
        </select>
      </label>
      {(
        [
          ["humanLoad", "context.humanLoad", "context-human-load"],
          ["childAccess", "context.childAccess", "context-child-access"],
        ] as const
      ).map(([field, labelKey, testId]) => (
        <label className="select-field" key={field}>
          <span>{t(labelKey)}</span>
          <select
            data-testid={testId}
            value={String(context[field])}
            onChange={(event) => {
              const raw = event.target.value;
              setProjectContext({ [field]: raw === "unknown" ? "unknown" : raw === "true" });
            }}
          >
            <option value="unknown">{t("context.unknown")}</option>
            <option value="true">{t("context.yes")}</option>
            <option value="false">{t("context.no")}</option>
          </select>
        </label>
      ))}
    </section>
  );
}

function RulesPanel() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const findings = evaluateRules(project);

  return (
    <div className="inspector-scroll">
      <ContextEditor />
      <div className="inspector-section-bar">
        <span>{t("checks.count", { count: findings.length })}</span>
        <span className={findings.some((item) => item.severity === "error") ? "bad" : "good"}>
          {findings.some((item) => item.severity === "error")
            ? t("checks.blocked")
            : t("checks.editable")}
        </span>
      </div>
      <div data-testid="rule-list">
        {findings.map((finding, index) => {
          const copy = localizeFinding(finding, project, t);
          return (
            <article
              className={`rule-card rule-card--${finding.severity}`}
              key={`${finding.ruleId}-${index}`}
            >
              <div className="rule-title">
                <span>{severityLabel(finding, t)}</span>
                <code>{finding.ruleId}</code>
              </div>
              <strong>{copy.message}</strong>
              <p>{copy.rationale}</p>
              {copy.suggestedActions && (
                <ul>
                  {copy.suggestedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              )}
              {finding.evidence.length > 0 && (
                <small>
                  {t("checks.source")}：
                  {finding.evidence
                    .map(
                      (evidence) =>
                        `${localizeEvidenceKind(evidence.kind, t)} / ${localizeConfidence(
                          evidence.confidence,
                          t,
                        )}`,
                    )
                    .join("，")}
                </small>
              )}
            </article>
          );
        })}
        {findings.length === 0 && (
          <div className="empty-state empty-state--success">
            <CheckCircle2 size={24} />
            <strong>{t("checks.emptyTitle")}</strong>
            <p>{t("checks.emptyHelp")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function InspectorPanel() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const findings = evaluateRules(project);
  const [tab, setTab] = useState<InspectorTab>("profiles");
  const toggleCollapsed = useLayoutStore((state) => state.toggleCollapsed);

  return (
    <aside className="side-panel inspector-panel">
      <div className="inspector-tabs" role="tablist" aria-label={t("inspector.aria")}>
        <button
          className={tab === "profiles" ? "is-active" : ""}
          data-testid="tab-profiles"
          type="button"
          role="tab"
          aria-selected={tab === "profiles"}
          onClick={() => setTab("profiles")}
        >
          <Boxes size={13} /> {t("inspector.profiles")}
          <span>{Object.keys(project.entities).length}</span>
        </button>
        <button
          className={tab === "joints" ? "is-active" : ""}
          data-testid="tab-joints"
          type="button"
          role="tab"
          aria-selected={tab === "joints"}
          onClick={() => setTab("joints")}
        >
          <Link2 size={13} /> {t("inspector.joints")}
          <span>{Object.keys(project.joints ?? {}).length}</span>
        </button>
        <button
          className={tab === "bom" ? "is-active" : ""}
          data-testid="tab-bom"
          type="button"
          role="tab"
          aria-selected={tab === "bom"}
          onClick={() => setTab("bom")}
        >
          <ClipboardList size={13} /> {t("inspector.cutList")}
        </button>
        <button
          className={tab === "sizing" ? "is-active" : ""}
          data-testid="tab-sizing"
          type="button"
          role="tab"
          aria-selected={tab === "sizing"}
          onClick={() => setTab("sizing")}
        >
          <Calculator size={13} /> {t("inspector.sizing")}
        </button>
        <button
          className={tab === "rules" ? "is-active" : ""}
          data-testid="tab-rules"
          type="button"
          role="tab"
          aria-selected={tab === "rules"}
          onClick={() => setTab("rules")}
        >
          <ShieldAlert size={13} /> {t("inspector.checks")}
          {findings.length > 0 && <span className="tab-alert">{findings.length}</span>}
        </button>
        <button
          className="inspector-collapse"
          type="button"
          aria-label={t("layout.collapseRight")}
          title={t("layout.collapseRight")}
          data-testid="collapse-right"
          onClick={() => toggleCollapsed("right")}
        >
          <PanelRightClose size={13} />
        </button>
      </div>
      <div className="inspector-content">
        {tab === "profiles" && <ProfileList />}
        {tab === "joints" && <JointsPanel />}
        {tab === "bom" && <BomPanel />}
        {tab === "sizing" && <StructuralSizingPanel />}
        {tab === "rules" && <RulesPanel />}
      </div>
    </aside>
  );
}
