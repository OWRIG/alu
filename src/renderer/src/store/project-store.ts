import { create } from "zustand";

import { applyCommandEnvelope, createCommandEnvelope } from "../../../domain/commands/apply";
import {
  commitHistory,
  createHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from "../../../domain/commands/history";
import type { DomainCommand, UpdateProfilePatch } from "../../../domain/commands/schema";
import {
  createBlankProject,
  createParametricClearanceFrameDemo,
  GENERIC_PROFILE_DEFINITIONS,
  snapshotDefinition,
} from "../../../domain/project/defaults";
import { asDomainError, DomainError } from "../../../domain/project/error";
import { computeDesignHash } from "../../../domain/project/hash";
import type {
  BindingField,
  ProfileInstance,
  ProjectDocumentV1,
} from "../../../domain/project/schema";
import type { OpenedProject, RecentProject, SavedProject } from "../../../shared/ipc/project";
import type { MessageKey, MessageValues } from "../i18n/messages";

export type UiError = {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
};

export type UiNotice = {
  key: MessageKey;
  values?: MessageValues;
};

type ProjectStore = {
  history: HistoryState<ProjectDocumentV1>;
  selectedEntityId: string | null;
  fileName: string | null;
  fileHash: string | null;
  savedDesignHash: string | null;
  bomDrift: boolean;
  busy: boolean;
  error: UiError | null;
  notice: UiNotice | null;
  recentProjects: RecentProject[];
  dispatch: (commands: DomainCommand[], selectedEntityId?: string | null) => boolean;
  setParameter: (id: string, valueMm: number) => boolean;
  addProfile: () => boolean;
  updateProfile: (entityId: string, patch: UpdateProfilePatch) => boolean;
  removeEntity: (entityId: string) => boolean;
  setBinding: (entityId: string, field: BindingField, param: string) => boolean;
  removeBinding: (entityId: string, field: BindingField) => boolean;
  resyncBinding: (entityId: string, field: BindingField) => boolean;
  selectEntity: (entityId: string | null) => void;
  undo: () => void;
  redo: () => void;
  newDemo: () => void;
  newBlank: () => void;
  loadInitial: () => Promise<void>;
  open: () => Promise<void>;
  openRecent: (id: string) => Promise<void>;
  refreshRecent: () => Promise<void>;
  save: () => Promise<boolean>;
  saveAs: () => Promise<boolean>;
  clearError: () => void;
  clearNotice: () => void;
};

const initialProject = createParametricClearanceFrameDemo();

function presentError(error: unknown): UiError {
  const domainError = asDomainError(error);
  return {
    code: domainError.code,
    message: domainError.message,
    path: domainError.path,
    suggestion: domainError.suggestion,
  };
}

function makeNotice(key: MessageKey, values?: MessageValues): UiNotice {
  return { key, values };
}

function firstEntityId(project: ProjectDocumentV1): string | null {
  if (project.entities["profile.top-front"]) return "profile.top-front";
  return (
    Object.keys(project.entities).sort((left, right) => left.localeCompare(right, "en"))[0] ?? null
  );
}

function replaceProject(opened: OpenedProject) {
  return {
    history: createHistory(opened.project),
    selectedEntityId: firstEntityId(opened.project),
    fileName: opened.fileName,
    fileHash: opened.fileHash,
    savedDesignHash: computeDesignHash(opened.project),
    bomDrift: opened.bomDrift,
    error: null,
    notice: opened.bomDrift
      ? makeNotice("notice.openedRecomputed", { fileName: opened.fileName })
      : makeNotice("notice.opened", { fileName: opened.fileName }),
  };
}

function savedProjectState(saved: SavedProject) {
  return {
    fileName: saved.fileName,
    fileHash: saved.fileHash,
    savedDesignHash: computeDesignHash(saved.project),
    bomDrift: false,
    error: null,
    notice: makeNotice("notice.saved", { fileName: saved.fileName }),
  };
}

function mergeSavedProject(state: ProjectStore, saved: SavedProject) {
  const savedState = savedProjectState(saved);
  const changedDuringSave = computeDesignHash(state.history.present) !== savedState.savedDesignHash;
  return {
    ...savedState,
    history: changedDuringSave ? state.history : { ...state.history, present: saved.project },
    notice: changedDuringSave
      ? makeNotice("notice.savedWithChanges", { fileName: saved.fileName })
      : savedState.notice,
  };
}

function nextProfile(project: ProjectDocumentV1): {
  profile: ProfileInstance;
  definitionSnapshot: ReturnType<typeof snapshotDefinition>;
} {
  const definition = GENERIC_PROFILE_DEFINITIONS[2];
  let ordinal = Object.keys(project.entities).length + 1;
  let id = `profile.member-${ordinal}`;
  while (project.entities[id]) {
    ordinal += 1;
    id = `profile.member-${ordinal}`;
  }
  return {
    profile: {
      id,
      kind: "profile",
      definitionRef: { partId: definition.id, revision: definition.revision },
      origin: { x: 0, y: 0, z: 0 },
      axis: "x",
      lengthMm: 500,
      rotationAroundAxisDeg: 0,
      purpose: `自定义构件 ${ordinal}`,
      endCutA: { kind: "square" },
      endCutB: { kind: "square" },
    },
    definitionSnapshot: snapshotDefinition(definition),
  };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  history: createHistory(initialProject),
  selectedEntityId: firstEntityId(initialProject),
  fileName: null,
  fileHash: null,
  savedDesignHash: null,
  bomDrift: false,
  busy: false,
  error: null,
  notice: makeNotice("notice.demoLoaded"),
  recentProjects: [],

  dispatch(commands, selectedEntityId) {
    if (get().busy) return false;
    try {
      const current = get().history.present;
      const next = applyCommandEnvelope(current, createCommandEnvelope(current, commands));
      set((state) => ({
        history: commitHistory(state.history, next),
        selectedEntityId:
          selectedEntityId === undefined ? state.selectedEntityId : selectedEntityId,
        error: null,
        notice: null,
        bomDrift: false,
      }));
      return true;
    } catch (error) {
      set({ error: presentError(error) });
      return false;
    }
  },

  setParameter(id, valueMm) {
    return get().dispatch([{ type: "parameters.set", values: { [id]: valueMm } }]);
  },

  addProfile() {
    const command = nextProfile(get().history.present);
    return get().dispatch([{ type: "profile.add", ...command }], command.profile.id);
  },

  updateProfile(entityId, patch) {
    return get().dispatch([{ type: "profile.update", entityId, patch }]);
  },

  removeEntity(entityId) {
    const project = get().history.present;
    const remaining = Object.keys(project.entities)
      .filter((id) => id !== entityId)
      .sort((left, right) => left.localeCompare(right, "en"));
    return get().dispatch([{ type: "entity.remove", entityId }], remaining[0] ?? null);
  },

  setBinding(entityId, field, param) {
    return get().dispatch([{ type: "binding.set", entityId, field, param }]);
  },

  removeBinding(entityId, field) {
    return get().dispatch([{ type: "binding.remove", entityId, field }]);
  },

  resyncBinding(entityId, field) {
    return get().dispatch([{ type: "binding.resync", entityId, field }]);
  },

  selectEntity(selectedEntityId) {
    set({ selectedEntityId });
  },

  undo() {
    if (get().busy) return;
    set((state) => {
      const history = undoHistory(state.history);
      return {
        history,
        selectedEntityId:
          state.selectedEntityId && history.present.entities[state.selectedEntityId]
            ? state.selectedEntityId
            : firstEntityId(history.present),
        error: null,
        notice: null,
      };
    });
  },

  redo() {
    if (get().busy) return;
    set((state) => {
      const history = redoHistory(state.history);
      return {
        history,
        selectedEntityId:
          state.selectedEntityId && history.present.entities[state.selectedEntityId]
            ? state.selectedEntityId
            : firstEntityId(history.present),
        error: null,
        notice: null,
      };
    });
  },

  newDemo() {
    if (get().busy) return;
    const project = createParametricClearanceFrameDemo();
    set({
      history: createHistory(project),
      selectedEntityId: firstEntityId(project),
      fileName: null,
      fileHash: null,
      savedDesignHash: null,
      bomDrift: false,
      error: null,
      notice: makeNotice("notice.demoCreated"),
    });
  },

  newBlank() {
    if (get().busy) return;
    const project = createBlankProject();
    set({
      history: createHistory(project),
      selectedEntityId: null,
      fileName: null,
      fileHash: null,
      savedDesignHash: null,
      bomDrift: false,
      error: null,
      notice: makeNotice("notice.blankCreated"),
    });
  },

  async loadInitial() {
    set({ busy: true });
    try {
      const response = await window.alu.project.getLaunch();
      if (!response.ok) throw new DomainError(response.error);
      if (response.data) set(replaceProject(response.data));
      await get().refreshRecent();
    } catch (error) {
      set({ error: presentError(error) });
    } finally {
      set({ busy: false });
    }
  },

  async open() {
    if (get().busy) return;
    set({ busy: true, error: null });
    try {
      const response = await window.alu.project.open();
      if (!response.ok) throw new DomainError(response.error);
      if (response.data) set(replaceProject(response.data));
      await get().refreshRecent();
    } catch (error) {
      set({ error: presentError(error) });
    } finally {
      set({ busy: false });
    }
  },

  async openRecent(id) {
    if (get().busy) return;
    set({ busy: true, error: null });
    try {
      const response = await window.alu.project.openRecent(id);
      if (!response.ok) throw new DomainError(response.error);
      if (response.data) set(replaceProject(response.data));
      await get().refreshRecent();
    } catch (error) {
      set({ error: presentError(error) });
    } finally {
      set({ busy: false });
    }
  },

  async refreshRecent() {
    try {
      const response = await window.alu.project.recent();
      if (!response.ok) throw new DomainError(response.error);
      set({ recentProjects: response.data });
    } catch (error) {
      set({ error: presentError(error) });
    }
  },

  async save() {
    if (get().busy) return false;
    set({ busy: true, error: null });
    try {
      const state = get();
      const response = state.fileName
        ? await window.alu.project.save(state.history.present)
        : await window.alu.project.saveAs(state.history.present);
      if (!response.ok) throw new DomainError(response.error);
      if (!response.data) return false;
      const saved = response.data;
      set((state) => mergeSavedProject(state, saved));
      await get().refreshRecent();
      return true;
    } catch (error) {
      set({ error: presentError(error) });
      return false;
    } finally {
      set({ busy: false });
    }
  },

  async saveAs() {
    if (get().busy) return false;
    set({ busy: true, error: null });
    try {
      const response = await window.alu.project.saveAs(get().history.present);
      if (!response.ok) throw new DomainError(response.error);
      if (!response.data) return false;
      const saved = response.data;
      set((state) => mergeSavedProject(state, saved));
      await get().refreshRecent();
      return true;
    } catch (error) {
      set({ error: presentError(error) });
      return false;
    } finally {
      set({ busy: false });
    }
  },

  clearError() {
    set({ error: null });
  },

  clearNotice() {
    set({ notice: null });
  },
}));

export function selectCurrentProject(state: ProjectStore): ProjectDocumentV1 {
  return state.history.present;
}

export function selectIsDirty(state: ProjectStore): boolean {
  return (
    state.savedDesignHash === null ||
    computeDesignHash(state.history.present) !== state.savedDesignHash
  );
}

export function selectCanUndo(state: ProjectStore): boolean {
  return state.history.past.length > 0;
}

export function selectCanRedo(state: ProjectStore): boolean {
  return state.history.future.length > 0;
}
