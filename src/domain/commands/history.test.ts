import { describe, expect, it } from "vitest";

import { commitHistory, createHistory, redoHistory, undoHistory } from "./history";

describe("editor history", () => {
  it("C-undo-redo-model-command moves across snapshots", () => {
    const initial = createHistory({ revision: 0 });
    const committed = commitHistory(initial, { revision: 1 });
    expect(undoHistory(committed).present.revision).toBe(0);
    expect(redoHistory(undoHistory(committed)).present.revision).toBe(1);
  });

  it("C-history-clears-redo-branch", () => {
    const committed = commitHistory(createHistory(0), 1);
    const undone = undoHistory(committed);
    expect(commitHistory(undone, 2).future).toEqual([]);
  });

  it("keeps at most 100 past snapshots", () => {
    let history = createHistory(0);
    for (let value = 1; value <= 110; value += 1) history = commitHistory(history, value);
    expect(history.past).toHaveLength(100);
    expect(history.past[0]).toBe(10);
  });
});
