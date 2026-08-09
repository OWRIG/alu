import { ChevronRight, FunctionSquare, Ruler } from "lucide-react";

import { evaluateParameters } from "../../../domain/params/evaluate";
import { localizeBoundary, localizeParameterLabel } from "../i18n/domain-copy";
import { useI18n } from "../i18n/i18n";
import type { MessageKey } from "../i18n/messages";
import { selectCurrentProject, useProjectStore } from "../store/project-store";
import { NumberField } from "./number-field";

const keyDimensionIds = [
  "innerClearWidth",
  "frameOuterWidth",
  "tabletopWidth",
  "beamUndersideClearance",
] as const;

const inputGroupDefinitions: Array<{
  title: MessageKey;
  help: MessageKey;
  ids: string[];
}> = [
  {
    title: "parameters.group.space",
    help: "parameters.group.spaceHelp",
    ids: [
      "bedOuterWidth",
      "mattressTopHeight",
      "clearanceLeft",
      "clearanceRight",
      "finishedHeight",
    ],
  },
  {
    title: "parameters.group.frame",
    help: "parameters.group.frameHelp",
    ids: ["uprightWidthX", "topFrameHeight", "topFrameOuterDepth"],
  },
  {
    title: "parameters.group.panel",
    help: "parameters.group.panelHelp",
    ids: ["panelFitClearance", "tabletopThickness"],
  },
];

export function ParameterPanel() {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const setParameter = useProjectStore((state) => state.setParameter);
  const values = evaluateParameters(project.parameters);
  const inputs = project.parameters.inputs;
  const derived = Object.entries(project.parameters.derived);
  const assignedIds = new Set(inputGroupDefinitions.flatMap((group) => group.ids));
  const groups = [
    ...inputGroupDefinitions.map((group) => ({
      ...group,
      entries: group.ids.flatMap((id) => (inputs[id] ? ([[id, inputs[id]]] as const) : [])),
    })),
    {
      title: "parameters.group.other" as const,
      help: "parameters.group.otherHelp" as const,
      entries: Object.entries(inputs).filter(([id]) => !assignedIds.has(id)),
    },
  ].filter((group) => group.entries.length > 0);
  const inputCount = Object.keys(inputs).length;

  return (
    <aside className="side-panel parameter-panel">
      <div className="module-head">
        <span className="module-index">01</span>
        <div className="module-copy">
          <span className="kicker">{t("parameters.step")}</span>
          <h2>{t("parameters.title")}</h2>
        </div>
        <span className="module-value">{t("parameters.count", { count: inputCount })}</span>
      </div>

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
              <section className="parameter-group" key={group.title}>
                <div className="parameter-group-head">
                  <strong>{t(group.title)}</strong>
                  <small>{t(group.help)}</small>
                </div>
                {group.entries.map(([id, input]) => {
                  const label = localizeParameterLabel(id, input.label, t);
                  return (
                    <div className="parameter-row" key={id}>
                      <div className="parameter-copy">
                        <label htmlFor={`parameter-${id}`}>{label}</label>
                        <span>
                          {localizeBoundary(input.boundaryKind, t)} · {id}
                        </span>
                      </div>
                      <NumberField
                        value={input.valueMm}
                        onCommit={(value) => setParameter(id, value)}
                        testId={`param-input-${id}`}
                        ariaLabel={label}
                      />
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
                  <div className="derived-row" key={id}>
                    <div>
                      <span>{localizeParameterLabel(id, definition.label, t)}</span>
                      <small>{id}</small>
                    </div>
                    <strong>{formatNumber(values[id])} mm</strong>
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
        </div>
      )}
    </aside>
  );
}
