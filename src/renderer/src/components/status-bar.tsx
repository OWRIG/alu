import { AlertTriangle, CircleDot, Ruler } from "lucide-react";

import { computeDesignHash } from "../../../domain/project/hash";
import { evaluateRules } from "../../../domain/rules/evaluate";
import { useI18n } from "../i18n/i18n";
import { selectCurrentProject, selectIsDirty, useProjectStore } from "../store/project-store";

export function StatusBar() {
  const { t } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const dirty = useProjectStore(selectIsDirty);
  const busy = useProjectStore((state) => state.busy);
  const findings = evaluateRules(project);
  const designHash = computeDesignHash(project);
  const blocking = findings.some((finding) => finding.severity === "error");

  return (
    <footer className="status-bar">
      <span>
        <CircleDot size={10} className={busy ? "status-pulse" : ""} />
        {busy ? t("status.busy") : dirty ? t("status.dirty") : t("status.saved")}
      </span>
      <span>{t("status.profiles", { count: Object.keys(project.entities).length })}</span>
      <span className={blocking ? "bad" : undefined}>
        <AlertTriangle size={10} /> {t("status.findings", { count: findings.length })}
      </span>
      <span className="status-spacer" />
      <span>{t("status.revision", { revision: project.revision })}</span>
      <span title={designHash}>{t("status.design", { hash: designHash.slice(0, 8) })}</span>
      <span>
        <Ruler size={10} /> {t("status.unit")}
      </span>
    </footer>
  );
}
