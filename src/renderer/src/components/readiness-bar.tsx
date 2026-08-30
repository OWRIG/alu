import { useState } from "react";
import { ChevronUp } from "lucide-react";

import {
  evaluateOrderReadiness,
  type OrderReadinessReason,
  type OrderReadinessStepId,
} from "../../../domain/report/readiness";
import { useI18n, type Translator } from "../i18n/i18n";
import type { MessageKey } from "../i18n/messages";
import { selectCurrentProject, useProjectStore } from "../store/project-store";

const stepKeys: Record<OrderReadinessStepId, MessageKey> = {
  profiles: "readiness.profiles",
  connectors: "readiness.connectors",
  machining: "readiness.machining",
  panels: "readiness.panels",
  casters: "readiness.casters",
};

const reasonKeys: Record<OrderReadinessReason, MessageKey> = {
  empty: "readiness.reason.empty",
  "concept-only": "readiness.reason.conceptOnly",
  "not-modelled": "readiness.reason.notModelled",
  "no-joints": "readiness.reason.noJoints",
  "open-ends": "readiness.reason.openEnds",
};

function reasonText(reason: OrderReadinessReason | undefined, t: Translator) {
  return reason ? t(reasonKeys[reason]) : t("readiness.ready");
}

/**
 * One place that says how far the project is from an orderable cut list.
 * Replaces the four repeated "not order-ready" disclaimers.
 */
export function ReadinessBar() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const [open, setOpen] = useState(false);
  const steps = evaluateOrderReadiness(project);
  const done = steps.filter((step) => step.ready).length;

  return (
    <div className={open ? "readiness is-open" : "readiness"} data-testid="readiness">
      <button
        className="readiness-summary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="readiness-label">{t("readiness.label")}</span>
        <span className="readiness-track" aria-hidden="true">
          {steps.map((step) => (
            <i className={step.ready ? "is-ready" : ""} key={step.id} />
          ))}
        </span>
        <span className="readiness-count" data-testid="readiness-count">
          {t("readiness.count", { done, total: steps.length })}
        </span>
        <ChevronUp className="readiness-chevron" size={11} />
      </button>
      {open && (
        <div className="readiness-detail" data-testid="readiness-detail">
          {steps.map((step) => (
            <div className={step.ready ? "is-ready" : ""} key={step.id}>
              <span>{t(stepKeys[step.id])}</span>
              <small>{reasonText(step.reason, t)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
