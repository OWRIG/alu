import { AlertTriangle, CircleDot } from "lucide-react";

import { evaluateRules } from "../../../domain/rules/evaluate";
import { useI18n } from "../i18n/i18n";
import { selectCurrentProject, selectIsDirty, useProjectStore } from "../store/project-store";
import { ReadinessBar } from "./readiness-bar";

export function StatusBar() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const dirty = useProjectStore(selectIsDirty);
  const busy = useProjectStore((state) => state.busy);
  const findings = evaluateRules(project);
  const blocking = findings.some((finding) => finding.severity === "error");

  return (
    <footer className="status-bar">
      <span>
        <CircleDot size={10} className={busy ? "status-pulse" : ""} />
        {busy ? t("status.busy") : dirty ? t("status.dirty") : t("status.saved")}
      </span>
      <span className={blocking ? "bad" : undefined}>
        <AlertTriangle size={10} /> {t("status.findings", { count: findings.length })}
      </span>
      <span className="status-spacer" />
      <ReadinessBar />
    </footer>
  );
}
