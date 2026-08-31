import { useEffect } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";

import { InspectorPanel } from "./components/inspector-panel";
import { ModelViewport } from "./components/model-viewport";
import { PanelResizer } from "./components/panel-resizer";
import { ParameterPanel } from "./components/parameter-panel";
import { StatusBar } from "./components/status-bar";
import { TopToolbar } from "./components/top-toolbar";
import { localizeError } from "./i18n/domain-copy";
import { useI18n } from "./i18n/i18n";
import { useLayoutStore } from "./store/layout-store";
import { selectIsDirty, useProjectStore } from "./store/project-store";

export function App() {
  const { locale, t } = useI18n();
  const leftWidth = useLayoutStore((state) => state.leftWidth);
  const rightWidth = useLayoutStore((state) => state.rightWidth);
  const leftCollapsed = useLayoutStore((state) => state.leftCollapsed);
  const rightCollapsed = useLayoutStore((state) => state.rightCollapsed);
  const loadInitial = useProjectStore((state) => state.loadInitial);
  const error = useProjectStore((state) => state.error);
  const notice = useProjectStore((state) => state.notice);
  const busy = useProjectStore((state) => state.busy);
  const clearError = useProjectStore((state) => state.clearError);
  const clearNotice = useProjectStore((state) => state.clearNotice);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      const target = event.target;
      const editingText =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (key === "s") {
        event.preventDefault();
        if (editingText && target instanceof HTMLElement) target.blur();
        const state = useProjectStore.getState();
        if (event.shiftKey) void state.saveAs();
        else void state.save();
      } else if (key === "o") {
        event.preventDefault();
        if (editingText && target instanceof HTMLElement) target.blur();
        const state = useProjectStore.getState();
        if (!selectIsDirty(state) || window.confirm(t("app.confirmDiscardOpen"))) {
          void state.open();
        }
      } else if (key === "z") {
        if (editingText) return;
        event.preventDefault();
        const state = useProjectStore.getState();
        if (event.shiftKey) state.redo();
        else state.undo();
      } else if (key === "y") {
        if (editingText) return;
        event.preventDefault();
        const state = useProjectStore.getState();
        state.redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [t]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(clearNotice, 4_000);
    return () => window.clearTimeout(timeout);
  }, [notice, clearNotice]);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    function preventUnsavedClose(event: BeforeUnloadEvent) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      if (!selectIsDirty(useProjectStore.getState())) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", preventUnsavedClose);
    return () => window.removeEventListener("beforeunload", preventUnsavedClose);
  }, []);

  return (
    <div className="app-shell">
      <TopToolbar />
      <div
        className="workspace"
        style={{
          gridTemplateColumns: [
            leftCollapsed ? "0px" : `${leftWidth}px`,
            "5px",
            "minmax(320px, 1fr)",
            "5px",
            rightCollapsed ? "0px" : `${rightWidth}px`,
          ].join(" "),
        }}
      >
        {leftCollapsed ? <div className="panel-collapsed" /> : <ParameterPanel />}
        <PanelResizer side="left" />
        <ModelViewport />
        <PanelResizer side="right" />
        {rightCollapsed ? <div className="panel-collapsed" /> : <InspectorPanel />}
      </div>
      <StatusBar />

      {busy && (
        <div className="busy-line" aria-label={t("app.busy")}>
          <span />
        </div>
      )}

      <div className="toast-stack" aria-live="polite">
        {error && (
          <div className="toast toast--error" role="alert" data-testid="error-toast">
            <AlertCircle size={16} />
            <span>{localizeError(error, locale, t)}</span>
            <button type="button" aria-label={t("app.closeError")} onClick={clearError}>
              <X size={14} />
            </button>
          </div>
        )}
        {notice && (
          <div className="toast toast--notice">
            <CheckCircle2 size={16} />
            <span>{t(notice.key, notice.values)}</span>
            <button type="button" aria-label={t("app.closeNotice")} onClick={clearNotice}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {busy && (
        <div className="sr-only">
          <LoaderCircle /> {t("app.busy")}
        </div>
      )}
    </div>
  );
}
