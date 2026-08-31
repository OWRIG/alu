import { useCallback, useEffect, useRef } from "react";

import { useI18n } from "../i18n/i18n";
import { LAYOUT_LIMITS, useLayoutStore, type PanelSide } from "../store/layout-store";

const KEYBOARD_STEP_PX = 16;

/**
 * Drag handle between the workspace columns. Dragging left/right resizes the
 * neighbouring panel; double-click restores the default width.
 */
export function PanelResizer({ side }: { side: PanelSide }) {
  const { t } = useI18n();
  const setWidth = useLayoutStore((state) => state.setWidth);
  const nudgeWidth = useLayoutStore((state) => state.nudgeWidth);
  const resetWidth = useLayoutStore((state) => state.resetWidth);
  const width = useLayoutStore((state) => (side === "left" ? state.leftWidth : state.rightWidth));
  const dragging = useRef(false);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current) return;
      // The left panel grows toward the pointer; the right one grows away from it.
      const next = side === "left" ? event.clientX : window.innerWidth - event.clientX;
      setWidth(side, next);
    },
    [side, setWidth],
  );

  const stopDragging = useCallback(() => {
    dragging.current = false;
    document.body.classList.remove("is-resizing");
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      document.body.classList.remove("is-resizing");
    };
  }, [onPointerMove, stopDragging]);

  return (
    <div
      className="panel-resizer"
      data-testid={`resizer-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={t("layout.resize")}
      aria-valuenow={width}
      aria-valuemin={LAYOUT_LIMITS[side].min}
      aria-valuemax={LAYOUT_LIMITS[side].max}
      tabIndex={0}
      onPointerDown={(event) => {
        event.preventDefault();
        dragging.current = true;
        document.body.classList.add("is-resizing");
      }}
      onDoubleClick={() => resetWidth(side)}
      onKeyDown={(event) => {
        const grow = side === "left" ? "ArrowRight" : "ArrowLeft";
        const shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
        if (event.key === grow) nudgeWidth(side, KEYBOARD_STEP_PX);
        else if (event.key === shrink) nudgeWidth(side, -KEYBOARD_STEP_PX);
        else if (event.key === "Home") resetWidth(side);
        else return;
        event.preventDefault();
      }}
    />
  );
}
