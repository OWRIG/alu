import {
  Check,
  ChevronDown,
  FilePlus2,
  FolderClock,
  FolderOpen,
  Languages,
  Redo2,
  Save,
  SaveAll,
  Undo2,
} from "lucide-react";

import { localizeKnownProjectName, localizeProjectName } from "../i18n/domain-copy";
import { useI18n } from "../i18n/i18n";
import {
  selectCanRedo,
  selectCanUndo,
  selectCurrentProject,
  selectIsDirty,
  useProjectStore,
} from "../store/project-store";

function closeMenu(target: HTMLElement) {
  target.closest("details")?.removeAttribute("open");
}

export function TopToolbar() {
  const { locale, setLocale, t, formatDateTime } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const dirty = useProjectStore(selectIsDirty);
  const canUndo = useProjectStore(selectCanUndo);
  const canRedo = useProjectStore(selectCanRedo);
  const fileName = useProjectStore((state) => state.fileName);
  const busy = useProjectStore((state) => state.busy);
  const recent = useProjectStore((state) => state.recentProjects);
  const newDemo = useProjectStore((state) => state.newDemo);
  const newBlank = useProjectStore((state) => state.newBlank);
  const open = useProjectStore((state) => state.open);
  const openRecent = useProjectStore((state) => state.openRecent);
  const save = useProjectStore((state) => state.save);
  const saveAs = useProjectStore((state) => state.saveAs);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);

  function canReplaceProject() {
    return !dirty || window.confirm(t("app.confirmDiscardContinue"));
  }

  return (
    <header className="topbar">
      <div className="brand" aria-label={t("brand.aria")}>
        <span className="brand-mark">铝</span>
        <span className="brand-word">ALU</span>
      </div>

      <span className="topbar-rule" />

      <div className="project-heading">
        <div className="project-title-row">
          <strong>{localizeProjectName(project, t)}</strong>
          {dirty && <span className="dirty-dot" title={t("toolbar.unsavedChanges")} />}
        </div>
        <div className="project-file-row">
          <span className="project-file-label">{t("toolbar.file")}</span>
          <span>{fileName ?? t("toolbar.unsavedFile")}</span>
        </div>
      </div>

      <span className="topbar-rule" />

      <div className="toolbar-actions">
        <details className="menu-popover">
          <summary className="tool-button" aria-label={t("toolbar.newProject")}>
            <FilePlus2 size={15} />
            <span>{t("toolbar.new")}</span>
            <ChevronDown size={13} />
          </summary>
          <div className="popover-panel popover-panel--left">
            <button
              type="button"
              onClick={(event) => {
                if (canReplaceProject()) newDemo();
                closeMenu(event.currentTarget);
              }}
            >
              <span>{t("toolbar.demo")}</span>
              <small>{t("toolbar.demoDescription")}</small>
            </button>
            <button
              type="button"
              onClick={(event) => {
                if (canReplaceProject()) newBlank();
                closeMenu(event.currentTarget);
              }}
            >
              <span>{t("toolbar.blank")}</span>
              <small>{t("toolbar.blankDescription")}</small>
            </button>
          </div>
        </details>

        <button
          className="tool-button"
          data-testid="open-project"
          type="button"
          disabled={busy}
          onClick={() => {
            if (canReplaceProject()) void open();
          }}
        >
          <FolderOpen size={15} />
          <span>{t("toolbar.open")}</span>
        </button>

        <details className="menu-popover">
          <summary
            className="icon-button"
            aria-label={t("toolbar.recent")}
            title={t("toolbar.recent")}
          >
            <FolderClock size={16} />
          </summary>
          <div className="popover-panel popover-panel--wide">
            <div className="popover-title">{t("toolbar.recent")}</div>
            {recent.length === 0 ? (
              <div className="popover-empty">{t("toolbar.recentEmpty")}</div>
            ) : (
              recent.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(event) => {
                    if (canReplaceProject()) void openRecent(item.id);
                    closeMenu(event.currentTarget);
                  }}
                >
                  <span>{localizeKnownProjectName(item.name, t)}</span>
                  <small>{formatDateTime(new Date(item.openedAt))}</small>
                </button>
              ))
            )}
          </div>
        </details>

        <span className="toolbar-divider" />

        <button
          className="tool-button tool-button--primary"
          data-testid="save-project"
          type="button"
          disabled={busy}
          onClick={() => void save()}
        >
          <Save size={15} />
          <span>{t("toolbar.save")}</span>
        </button>
        <button
          className="icon-button"
          type="button"
          title={t("toolbar.saveAs")}
          aria-label={t("toolbar.saveAs")}
          disabled={busy}
          onClick={() => void saveAs()}
        >
          <SaveAll size={16} />
        </button>

        <span className="toolbar-divider" />

        <button
          className="icon-button"
          data-testid="undo"
          type="button"
          title={t("toolbar.undoTitle")}
          aria-label={t("toolbar.undo")}
          disabled={!canUndo || busy}
          onClick={undo}
        >
          <Undo2 size={16} />
        </button>
        <button
          className="icon-button"
          data-testid="redo"
          type="button"
          title={t("toolbar.redoTitle")}
          aria-label={t("toolbar.redo")}
          disabled={!canRedo || busy}
          onClick={redo}
        >
          <Redo2 size={16} />
        </button>

        <span className="toolbar-divider" />

        <details className="menu-popover language-menu">
          <summary
            className="icon-button"
            data-testid="language-menu"
            aria-label={t("toolbar.language")}
            title={t("toolbar.language")}
          >
            <Languages size={16} />
          </summary>
          <div className="popover-panel popover-panel--language">
            <div className="popover-title">{t("toolbar.language")}</div>
            {(["en-US", "zh-CN"] as const).map((item) => (
              <button
                className="locale-option"
                data-testid={`locale-${item}`}
                key={item}
                type="button"
                onClick={(event) => {
                  setLocale(item);
                  closeMenu(event.currentTarget);
                }}
              >
                <span>{t(item === "zh-CN" ? "locale.zh" : "locale.en")}</span>
                {locale === item && <Check size={13} />}
              </button>
            ))}
          </div>
        </details>
      </div>

      <div className="concept-flag">
        <span />
        {t("toolbar.conceptOnly")}
      </div>
    </header>
  );
}
