import { describe, expect, it } from "vitest";

import { createMobileOverbedDemo } from "../../../domain/project/defaults";
import { evaluateRules } from "../../../domain/rules/evaluate";
import {
  localizeError,
  localizeFinding,
  localizeParameterLabel,
  localizeProfilePurpose,
  localizeProjectName,
} from "./domain-copy";
import { translate } from "./i18n";
import { enUS, zhCN, type MessageKey } from "./messages";

function placeholders(message: string) {
  return [...message.matchAll(/\{([a-zA-Z0-9]+)\}/g)].map((match) => match[1]).sort();
}

describe("renderer i18n", () => {
  it("keeps both dictionaries structurally identical", () => {
    expect(Object.keys(enUS).sort()).toEqual(Object.keys(zhCN).sort());
    for (const key of Object.keys(zhCN) as MessageKey[]) {
      expect(placeholders(enUS[key]), key).toEqual(placeholders(zhCN[key]));
    }
    for (const [key, message] of Object.entries(enUS)) {
      if (key !== "locale.zh") expect(message, key).not.toMatch(/[\u3400-\u9fff]/u);
    }
  });

  it("interpolates values without leaving template tokens", () => {
    expect(translate("zh-CN", "notice.saved", { fileName: "desk.alu" })).toBe("已保存 desk.alu");
    expect(translate("en-US", "notice.saved", { fileName: "desk.alu" })).toBe("Saved desk.alu");
  });

  it("localizes built-in content by stable identity", () => {
    const project = createMobileOverbedDemo({
      projectId: "project.i18n",
      now: "2026-08-09T00:00:00.000Z",
    });
    const t = (key: MessageKey, values?: Record<string, string | number>) =>
      translate("en-US", key, values);

    expect(localizeProjectName(project, t)).toBe("Mobile Overbed Table Concept");
    expect(localizeParameterLabel("panelFitClearance", "嵌板单边安装缝", t)).toBe(
      "Panel gap per side",
    );
    expect(localizeProfilePurpose("profile.top-front", "顶部长跨主梁", t)).toBe(
      "Long-span top beam",
    );
    expect(localizeProfilePurpose("profile.custom-user", "用户自己的用途", t)).toBe(
      "用户自己的用途",
    );
    expect(localizeParameterLabel("finishedHeight", "用户自定义高度", t)).toBe("用户自定义高度");

    const finding = evaluateRules(project).find(
      (item) => item.ruleId === "structure.long-span-review",
    );
    expect(finding).toBeDefined();
    expect(localizeFinding(finding!, project, t).message).toBe(
      "Long-span top beam spans 2230 mm and needs a deflection review.",
    );
  });

  it("does not leak Chinese domain errors into the English interface", () => {
    const t = (key: MessageKey, values?: Record<string, string | number>) =>
      translate("en-US", key, values);
    expect(
      localizeError({ code: "command.schema-invalid", message: "长度必须大于 0 mm" }, "en-US", t),
    ).toBe("Length must be greater than 0 mm.");
  });
});
