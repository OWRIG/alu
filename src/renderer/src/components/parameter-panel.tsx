import { useState } from "react";
import {
  ChevronRight,
  FunctionSquare,
  PanelLeftClose,
  Pencil,
  Plus,
  Ruler,
  Trash2,
  X,
} from "lucide-react";

import { evaluateParameters } from "../../../domain/params/evaluate";
import type { ParameterInput } from "../../../domain/project/schema";
import { localizeBoundary, localizeParameterLabel } from "../i18n/domain-copy";
import { useI18n } from "../i18n/i18n";
import { useLayoutStore } from "../store/layout-store";
import { selectCurrentProject, useProjectStore } from "../store/project-store";
import { NumberField } from "./number-field";

const keyDimensionIds = [
  "innerClearWidth",
  "frameOuterWidth",
  "tabletopWidth",
  "beamUndersideClearance",
] as const;

type BoundaryKind = NonNullable<ParameterInput["boundaryKind"]>;
type DraftTerm = { param: string; coef: string };
type ParameterDraft =
  | {
      kind: "input";
      id: string;
      fixedId: boolean;
      label: string;
      valueMm: string;
      boundaryKind: BoundaryKind;
    }
  | {
      kind: "derived";
      id: string;
      fixedId: boolean;
      label: string;
      constantMm: string;
      terms: DraftTerm[];
    };

const boundaryKinds: BoundaryKind[] = [
  "obstacle-outer",
  "clearance",
  "inner-clear",
  "frame-outer",
  "panel",
  "height",
  "generic",
];

/** Renders a derived parameter as the sum users can check by hand: `= 2100 + 20 + 40×2`. */
function formatFormula(
  definition: { constantMm: number; terms: Array<{ param: string; coef: number }> },
  values: Record<string, number>,
): string {
  const parts: string[] = [];
  if (definition.constantMm !== 0 || definition.terms.length === 0) {
    parts.push(String(definition.constantMm));
  }
  for (const term of definition.terms) {
    const value = values[term.param];
    if (value === undefined) continue;
    const magnitude = Math.abs(term.coef);
    const piece = magnitude === 1 ? `${Math.abs(value)}` : `${Math.abs(value)}×${magnitude}`;
    const sign = term.coef * value < 0 ? "−" : "+";
    parts.push(parts.length === 0 ? `${sign === "−" ? "−" : ""}${piece}` : `${sign} ${piece}`);
  }
  return `= ${parts.join(" ")}`;
}

function newInputDraft(): ParameterDraft {
  return {
    kind: "input",
    id: "",
    fixedId: false,
    label: "",
    valueMm: "0",
    boundaryKind: "generic",
  };
}

function newDerivedDraft(parameterIds: string[]): ParameterDraft {
  return {
    kind: "derived",
    id: "",
    fixedId: false,
    label: "",
    constantMm: "0",
    terms: [{ param: parameterIds[0] ?? "", coef: "1" }],
  };
}

export function ParameterPanel() {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const setParameter = useProjectStore((state) => state.setParameter);
  const upsertInputParameter = useProjectStore((state) => state.upsertInputParameter);
  const upsertDerivedParameter = useProjectStore((state) => state.upsertDerivedParameter);
  const removeParameter = useProjectStore((state) => state.removeParameter);
  const toggleCollapsed = useLayoutStore((state) => state.toggleCollapsed);
  const [draft, setDraft] = useState<ParameterDraft | null>(null);
  const values = evaluateParameters(project.parameters);
  const inputs = project.parameters.inputs;
  const derived = Object.entries(project.parameters.derived);
  const parameterIds = [...Object.keys(inputs), ...Object.keys(project.parameters.derived)].sort(
    (left, right) => left.localeCompare(right, "en"),
  );
  // Grouping comes from the project's own boundaryKind field, so a blank project
  // groups exactly like the built-in example instead of falling into one bucket.
  const groups = boundaryKinds
    .map((kind) => ({
      kind,
      entries: Object.entries(inputs).filter(
        ([, input]) => (input.boundaryKind ?? "generic") === kind,
      ),
    }))
    .filter((group) => group.entries.length > 0);
  const inputCount = Object.keys(inputs).length;

  function editInput(id: string) {
    const input = inputs[id];
    setDraft({
      kind: "input",
      id,
      fixedId: true,
      label: input.label ?? "",
      valueMm: String(input.valueMm),
      boundaryKind: input.boundaryKind ?? "generic",
    });
  }

  function editDerived(id: string) {
    const definition = project.parameters.derived[id];
    setDraft({
      kind: "derived",
      id,
      fixedId: true,
      label: definition.label ?? "",
      constantMm: String(definition.constantMm),
      terms: definition.terms.map((term) => ({ param: term.param, coef: String(term.coef) })),
    });
  }

  function saveDraft() {
    if (!draft || !draft.id.trim()) return;
    const id = draft.id.trim();
    const label = draft.label.trim() || undefined;
    const saved =
      draft.kind === "input"
        ? upsertInputParameter(id, {
            valueMm: Number(draft.valueMm),
            label,
            boundaryKind: draft.boundaryKind,
          })
        : upsertDerivedParameter(id, {
            label,
            constantMm: Number(draft.constantMm),
            terms: draft.terms.map((term) => ({
              param: term.param,
              coef: Number(term.coef),
            })),
          });
    if (saved) setDraft(null);
  }

  function deleteDraft() {
    if (!draft?.fixedId) return;
    if (!window.confirm(t("parameters.deleteConfirm", { id: draft.id }))) return;
    if (removeParameter(draft.id)) setDraft(null);
  }

  return (
    <aside className="side-panel parameter-panel">
      <div className="module-head">
        <div className="module-copy">
          <h2>{t("parameters.title")}</h2>
        </div>
        <span className="module-value">{t("parameters.count", { count: inputCount })}</span>
        <button
          className="module-action"
          type="button"
          aria-label={t("parameters.add")}
          title={t("parameters.add")}
          data-testid="parameter-add"
          onClick={() => setDraft(newInputDraft())}
        >
          <Plus size={14} />
        </button>
        <button
          className="module-action"
          type="button"
          aria-label={t("layout.collapseLeft")}
          title={t("layout.collapseLeft")}
          data-testid="collapse-left"
          onClick={() => toggleCollapsed("left")}
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {draft && (
        <section className="parameter-editor" data-testid="parameter-editor">
          <div className="parameter-editor-head">
            <strong>
              {draft.fixedId ? t("parameters.editDefinition") : t("parameters.newDefinition")}
            </strong>
            <button
              type="button"
              aria-label={t("parameters.cancel")}
              onClick={() => setDraft(null)}
            >
              <X size={14} />
            </button>
          </div>
          {!draft.fixedId && (
            <div className="parameter-kind-switch">
              <button
                className={draft.kind === "input" ? "is-active" : ""}
                type="button"
                data-testid="parameter-kind-input"
                onClick={() => setDraft(newInputDraft())}
              >
                {t("parameters.kind.input")}
              </button>
              <button
                className={draft.kind === "derived" ? "is-active" : ""}
                type="button"
                data-testid="parameter-kind-derived"
                onClick={() => setDraft(newDerivedDraft(parameterIds))}
              >
                {t("parameters.kind.derived")}
              </button>
            </div>
          )}
          <label className="parameter-editor-field">
            <span>{t("parameters.id")}</span>
            <input
              data-testid="parameter-definition-id"
              value={draft.id}
              disabled={draft.fixedId}
              placeholder="frameOuterWidth"
              onChange={(event) => setDraft({ ...draft, id: event.target.value })}
            />
          </label>
          <label className="parameter-editor-field">
            <span>{t("parameters.label")}</span>
            <input
              value={draft.label}
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            />
          </label>
          {draft.kind === "input" ? (
            <>
              <label className="parameter-editor-field">
                <span>{t("parameters.value")}</span>
                <input
                  data-testid="parameter-definition-value"
                  type="number"
                  value={draft.valueMm}
                  onChange={(event) => setDraft({ ...draft, valueMm: event.target.value })}
                />
              </label>
              <label className="parameter-editor-field">
                <span>{t("parameters.boundary")}</span>
                <select
                  value={draft.boundaryKind}
                  onChange={(event) =>
                    setDraft({ ...draft, boundaryKind: event.target.value as BoundaryKind })
                  }
                >
                  {boundaryKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {localizeBoundary(kind, t)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="parameter-editor-field">
                <span>{t("parameters.constant")}</span>
                <input
                  type="number"
                  value={draft.constantMm}
                  onChange={(event) => setDraft({ ...draft, constantMm: event.target.value })}
                />
              </label>
              <div className="parameter-term-list">
                <div className="parameter-term-head">
                  <span>{t("parameters.terms")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        terms: [...draft.terms, { param: parameterIds[0] ?? "", coef: "1" }],
                      })
                    }
                  >
                    <Plus size={12} /> {t("parameters.addTerm")}
                  </button>
                </div>
                {draft.terms.map((term, index) => (
                  <div className="parameter-term" key={`${index}-${term.param}`}>
                    <select
                      aria-label={t("parameters.termParameter")}
                      value={term.param}
                      onChange={(event) => {
                        const terms = [...draft.terms];
                        terms[index] = { ...term, param: event.target.value };
                        setDraft({ ...draft, terms });
                      }}
                    >
                      <option value="">{t("parameters.selectParameter")}</option>
                      {parameterIds
                        .filter((id) => id !== draft.id)
                        .map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                    </select>
                    <input
                      aria-label={t("parameters.coefficient")}
                      type="number"
                      step="0.1"
                      value={term.coef}
                      onChange={(event) => {
                        const terms = [...draft.terms];
                        terms[index] = { ...term, coef: event.target.value };
                        setDraft({ ...draft, terms });
                      }}
                    />
                    <button
                      type="button"
                      aria-label={t("parameters.removeTerm")}
                      disabled={draft.terms.length === 1}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          terms: draft.terms.filter((_, termIndex) => termIndex !== index),
                        })
                      }
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="parameter-editor-actions">
            {draft.fixedId && (
              <button className="is-danger" type="button" onClick={deleteDraft}>
                <Trash2 size={12} /> {t("parameters.delete")}
              </button>
            )}
            <button type="button" onClick={() => setDraft(null)}>
              {t("parameters.cancel")}
            </button>
            <button
              className="is-primary"
              type="button"
              data-testid="parameter-definition-save"
              disabled={
                !draft.id.trim() ||
                (draft.kind === "derived" && draft.terms.some((term) => !term.param))
              }
              onClick={saveDraft}
            >
              {t("parameters.saveDefinition")}
            </button>
          </div>
        </section>
      )}

      {inputCount > 0 && (
        <>
          <div className="section-label section-label--primary">
            <span>
              <Ruler size={13} /> {t("parameters.keyResults")}
            </span>
          </div>
          <section className="dimension-summary" aria-label={t("parameters.keyResults")}>
            {keyDimensionIds.map((id) =>
              values[id] === undefined ? null : (
                <div key={id} data-testid={`derived-${id}`}>
                  <span>{localizeParameterLabel(id, undefined, t)}</span>
                  <strong>
                    {formatNumber(values[id])}
                    <small>mm</small>
                  </strong>
                </div>
              ),
            )}
          </section>

          <div className="parameter-groups">
            {groups.map((group) => (
              <section className="parameter-group" key={group.kind}>
                <div className="parameter-group-head">
                  <strong>{localizeBoundary(group.kind, t)}</strong>
                  <small>{t("parameters.count", { count: group.entries.length })}</small>
                </div>
                {group.entries.map(([id, input]) => {
                  const label = localizeParameterLabel(id, input.label, t);
                  return (
                    <div className="parameter-row" key={id}>
                      <div className="parameter-copy">
                        <label htmlFor={`parameter-${id}`}>{label}</label>
                        <span>{id}</span>
                      </div>
                      <div className="parameter-row-actions">
                        <NumberField
                          value={input.valueMm}
                          onCommit={(value) => setParameter(id, value)}
                          testId={`param-input-${id}`}
                          ariaLabel={label}
                        />
                        <button
                          type="button"
                          aria-label={t("parameters.editDefinition")}
                          onClick={() => editInput(id)}
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          {derived.length > 0 && (
            <details className="derived-disclosure" data-testid="derived-disclosure">
              <summary>
                <span>
                  <FunctionSquare size={13} /> {t("parameters.allResults")}
                </span>
                <small>{t("parameters.resultsCount", { count: derived.length })}</small>
                <ChevronRight size={14} className="disclosure-chevron" />
              </summary>
              <div className="derived-list">
                {derived.map(([id, definition]) => (
                  <div className="derived-row" data-testid={`derived-definition-${id}`} key={id}>
                    <div>
                      <span>{localizeParameterLabel(id, definition.label, t)}</span>
                      <small className="derived-formula">{formatFormula(definition, values)}</small>
                    </div>
                    <div className="derived-row-value">
                      <strong>{formatNumber(values[id])} mm</strong>
                      <button
                        type="button"
                        aria-label={t("parameters.editDefinition")}
                        onClick={() => editDerived(id)}
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {inputCount === 0 && (
        <div className="empty-state empty-state--compact">
          <Ruler size={22} />
          <p>{t("parameters.empty")}</p>
          <button type="button" onClick={() => setDraft(newInputDraft())}>
            <Plus size={13} /> {t("parameters.addFirst")}
          </button>
        </div>
      )}
    </aside>
  );
}
