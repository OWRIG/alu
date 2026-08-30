import { useState } from "react";
import { Link2, Plus, Trash2, X } from "lucide-react";

import { deriveMachining } from "../../../domain/joints/machining";
import type { BoltSize, Joint, JointType } from "../../../domain/project/schema";
import { localizeProfilePurpose } from "../i18n/domain-copy";
import { useI18n, type Translator } from "../i18n/i18n";
import type { MessageKey } from "../i18n/messages";
import { selectCurrentProject, useProjectStore } from "../store/project-store";

const JOINT_TYPES: JointType[] = ["corner-bracket", "hidden-connector", "butt-screw"];
const BOLT_SIZES: BoltSize[] = [5, 6, 8];

const typeKeys: Record<JointType, MessageKey> = {
  "corner-bracket": "joints.type.cornerBracket",
  "hidden-connector": "joints.type.hiddenConnector",
  "butt-screw": "joints.type.buttScrew",
};

const typeHelpKeys: Record<JointType, MessageKey> = {
  "corner-bracket": "joints.type.cornerBracketHelp",
  "hidden-connector": "joints.type.hiddenConnectorHelp",
  "butt-screw": "joints.type.buttScrewHelp",
};

export function localizeJointType(jointType: JointType, t: Translator): string {
  return t(typeKeys[jointType]);
}

type Draft = {
  primaryEntityId: string;
  end: "a" | "b";
  secondaryEntityId: string;
  jointType: JointType;
  boltSizeMm: BoltSize;
  boltCount: 1 | 2;
};

/** A corner bracket clamps on from outside, so it drills nothing. */
function holesFor(jointType: JointType, boltCount: number): number {
  return jointType === "corner-bracket" ? 0 : boltCount * 2;
}

export function JointsPanel() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const addJoint = useProjectStore((state) => state.addJoint);
  const removeJoint = useProjectStore((state) => state.removeJoint);
  const selectedJointId = useProjectStore((state) => state.selectedJointId);
  const selectJoint = useProjectStore((state) => state.selectJoint);
  const [draft, setDraft] = useState<Draft | null>(null);

  const profiles = Object.values(project.entities).sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  );
  const joints = Object.values(project.joints ?? {}).sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  );
  const machining = deriveMachining(project);

  function label(entityId: string): string {
    const profile = project.entities[entityId];
    return profile ? localizeProfilePurpose(profile.id, profile.purpose, t) : entityId;
  }

  function startDraft() {
    setDraft({
      primaryEntityId: profiles[0]?.id ?? "",
      end: "a",
      secondaryEntityId: profiles[1]?.id ?? "",
      jointType: "corner-bracket",
      boltSizeMm: 8,
      boltCount: 2,
    });
  }

  function submit() {
    if (!draft) return;
    const joint: Joint = {
      id: `joint.${globalThis.crypto.randomUUID().slice(0, 8)}`,
      kind: "joint",
      jointType: draft.jointType,
      primary: { entityId: draft.primaryEntityId, end: draft.end },
      secondaryEntityId: draft.secondaryEntityId,
      boltSizeMm: draft.boltSizeMm,
      boltCount: draft.boltCount,
    };
    if (addJoint(joint)) setDraft(null);
  }

  return (
    <div className="inspector-scroll" data-testid="joints-panel">
      <div className="inspector-section-bar">
        <span>{t("joints.count", { count: joints.length })}</span>
        <button
          type="button"
          data-testid="joint-add"
          disabled={profiles.length < 2}
          onClick={startDraft}
        >
          <Plus size={13} /> {t("joints.add")}
        </button>
      </div>

      {profiles.length < 2 && <p className="sizing-inline-note">{t("joints.noProfiles")}</p>}

      {draft && (
        <section className="joint-editor" data-testid="joint-editor">
          <div className="parameter-editor-head">
            <strong>{t("joints.add")}</strong>
            <button type="button" aria-label={t("joints.cancel")} onClick={() => setDraft(null)}>
              <X size={14} />
            </button>
          </div>

          <label className="study-field">
            <span>{t("joints.primary")}</span>
            <small>{t("joints.primaryHelp")}</small>
            <select
              data-testid="joint-primary"
              value={draft.primaryEntityId}
              onChange={(event) => setDraft({ ...draft, primaryEntityId: event.target.value })}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {label(profile.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="study-field">
            <span>{t("joints.end")}</span>
            <select
              data-testid="joint-end"
              value={draft.end}
              onChange={(event) => setDraft({ ...draft, end: event.target.value as "a" | "b" })}
            >
              <option value="a">{t("joints.end.a")}</option>
              <option value="b">{t("joints.end.b")}</option>
            </select>
          </label>

          <label className="study-field">
            <span>{t("joints.secondary")}</span>
            <select
              data-testid="joint-secondary"
              value={draft.secondaryEntityId}
              onChange={(event) => setDraft({ ...draft, secondaryEntityId: event.target.value })}
            >
              {profiles
                .filter((profile) => profile.id !== draft.primaryEntityId)
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {label(profile.id)}
                  </option>
                ))}
            </select>
          </label>

          <label className="study-field">
            <span>{t("joints.type")}</span>
            <small>{t(typeHelpKeys[draft.jointType])}</small>
            <select
              data-testid="joint-type"
              value={draft.jointType}
              onChange={(event) =>
                setDraft({ ...draft, jointType: event.target.value as JointType })
              }
            >
              {JOINT_TYPES.map((jointType) => (
                <option key={jointType} value={jointType}>
                  {t(typeKeys[jointType])}
                </option>
              ))}
            </select>
          </label>

          <div className="joint-bolt-row">
            <label className="study-field">
              <span>{t("joints.bolt")}</span>
              <select
                data-testid="joint-bolt-size"
                value={draft.boltSizeMm}
                onChange={(event) =>
                  setDraft({ ...draft, boltSizeMm: Number(event.target.value) as BoltSize })
                }
              >
                {BOLT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    M{size}
                  </option>
                ))}
              </select>
            </label>
            <label className="study-field">
              <span>{t("joints.boltCount")}</span>
              <select
                data-testid="joint-bolt-count"
                value={draft.boltCount}
                onChange={(event) =>
                  setDraft({ ...draft, boltCount: Number(event.target.value) as 1 | 2 })
                }
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
          </div>

          <p className="joint-preview" data-testid="joint-drill-preview">
            {holesFor(draft.jointType, draft.boltCount) === 0
              ? t("joints.noDrill")
              : t("joints.willDrill", { count: holesFor(draft.jointType, draft.boltCount) })}
          </p>

          <div className="parameter-editor-actions">
            <button type="button" onClick={() => setDraft(null)}>
              {t("joints.cancel")}
            </button>
            <button
              className="is-primary"
              type="button"
              data-testid="joint-create"
              disabled={!draft.primaryEntityId || !draft.secondaryEntityId}
              onClick={submit}
            >
              {t("joints.create")}
            </button>
          </div>
        </section>
      )}

      <div className="entity-list">
        {joints.map((joint) => {
          const holes = machining.filter((op) => op.sourceJointId === joint.id).length;
          return (
            <button
              className={joint.id === selectedJointId ? "entity-card is-selected" : "entity-card"}
              data-testid={`joint-card-${joint.id}`}
              key={joint.id}
              type="button"
              onClick={() => selectJoint(joint.id === selectedJointId ? null : joint.id)}
            >
              <span className="entity-axis">
                <Link2 size={12} />
              </span>
              <span className="entity-copy">
                <strong>{t(typeKeys[joint.jointType])}</strong>
                <small>
                  {label(joint.primary.entityId)} · {joint.primary.end.toUpperCase()} →{" "}
                  {label(joint.secondaryEntityId)}
                </small>
              </span>
              <span className="entity-length">
                {holes === 0 ? t("joints.noDrill") : t("machining.count", { count: holes })}
              </span>
            </button>
          );
        })}
        {joints.length === 0 && profiles.length >= 2 && (
          <div className="empty-state empty-state--compact">
            <Link2 size={22} />
            <p>{t("joints.empty")}</p>
            <button type="button" onClick={startDraft}>
              <Plus size={13} /> {t("joints.addFirst")}
            </button>
          </div>
        )}
      </div>

      {selectedJointId && project.joints?.[selectedJointId] && (
        <section className="property-editor">
          <div className="property-editor-title">
            <div>
              <span>{t("joints.properties")}</span>
              <small>{selectedJointId}</small>
            </div>
            <button
              className="danger-icon-button"
              type="button"
              aria-label={t("joints.delete")}
              title={t("joints.delete")}
              data-testid="joint-delete"
              onClick={() => removeJoint(selectedJointId)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
