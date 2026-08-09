import { describe, expect, it } from "vitest";

import { getNativeCopy } from "./native-copy";

describe("getNativeCopy", () => {
  it("keeps native project dialogs in the selected interface language", () => {
    const chinese = getNativeCopy("zh-CN");
    const english = getNativeCopy("en-US");

    expect(chinese.openProject).toBe("打开 ALU 工程");
    expect(chinese.continueEditing).toBe("继续编辑");
    expect(english.openProject).toBe("Open ALU project");
    expect(english.continueEditing).toBe("Keep editing");
    expect(Object.values(english).join(" ")).not.toMatch(/[\u3400-\u9fff]/u);
  });
});
