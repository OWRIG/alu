import { create } from "zustand";

/**
 * Workspace column widths are a machine-local preference, not project data.
 * They stay in localStorage and never touch the .alu document.
 */
const STORAGE_KEY = "alu.workspace-layout.v1";

export const LAYOUT_LIMITS = {
  left: { min: 220, max: 460, default: 296 },
  right: { min: 280, max: 520, default: 344 },
} as const;

export type PanelSide = keyof typeof LAYOUT_LIMITS;

export type LayoutState = {
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
};

export function clampWidth(side: PanelSide, value: number): number {
  const { min, max } = LAYOUT_LIMITS[side];
  if (!Number.isFinite(value)) return LAYOUT_LIMITS[side].default;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const defaultState: LayoutState = {
  leftWidth: LAYOUT_LIMITS.left.default,
  rightWidth: LAYOUT_LIMITS.right.default,
  leftCollapsed: false,
  rightCollapsed: false,
};

function readStored(): LayoutState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<LayoutState>;
    return {
      leftWidth: clampWidth("left", parsed.leftWidth ?? defaultState.leftWidth),
      rightWidth: clampWidth("right", parsed.rightWidth ?? defaultState.rightWidth),
      leftCollapsed: parsed.leftCollapsed === true,
      rightCollapsed: parsed.rightCollapsed === true,
    };
  } catch {
    return defaultState;
  }
}

function persist(state: LayoutState): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A full or unavailable localStorage must not break the editor.
  }
}

type LayoutStore = LayoutState & {
  setWidth: (side: PanelSide, value: number) => void;
  nudgeWidth: (side: PanelSide, deltaPx: number) => void;
  resetWidth: (side: PanelSide) => void;
  toggleCollapsed: (side: PanelSide) => void;
};

function snapshot(state: LayoutStore): LayoutState {
  return {
    leftWidth: state.leftWidth,
    rightWidth: state.rightWidth,
    leftCollapsed: state.leftCollapsed,
    rightCollapsed: state.rightCollapsed,
  };
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...readStored(),

  setWidth(side, value) {
    const key = side === "left" ? "leftWidth" : "rightWidth";
    set({ [key]: clampWidth(side, value) } as Partial<LayoutState>);
    persist(snapshot(get()));
  },

  nudgeWidth(side, deltaPx) {
    const current = side === "left" ? get().leftWidth : get().rightWidth;
    get().setWidth(side, current + deltaPx);
  },

  resetWidth(side) {
    get().setWidth(side, LAYOUT_LIMITS[side].default);
  },

  toggleCollapsed(side) {
    const key = side === "left" ? "leftCollapsed" : "rightCollapsed";
    set({ [key]: !get()[key] } as Partial<LayoutState>);
    persist(snapshot(get()));
  },
}));
