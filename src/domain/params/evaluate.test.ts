import { describe, expect, it } from "vitest";

import { DomainError } from "../project/error";
import { loadOverbedFixture } from "../../test-support/fixture";
import { evaluateParameters } from "./evaluate";

describe("C-param-derived-chain", () => {
  it("evaluates the overbed dimension chain", () => {
    const values = evaluateParameters(loadOverbedFixture().parameters);
    expect(values).toMatchObject({
      innerClearWidth: 2150,
      frameOuterWidth: 2230,
      tabletopWidth: 2270,
      clearanceAboveMattress: 232,
    });
  });

  it("rejects a missing parameter reference", () => {
    expect(() =>
      evaluateParameters({
        inputs: {},
        derived: {
          broken: { terms: [{ param: "missing", coef: 1 }], constantMm: 0 },
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "dimension.parameter-ref-missing" }),
    );
  });

  it("C-param-cycle-error reports a cycle", () => {
    expect(() =>
      evaluateParameters({
        inputs: {},
        derived: {
          first: { terms: [{ param: "second", coef: 1 }], constantMm: 0 },
          second: { terms: [{ param: "first", coef: 1 }], constantMm: 0 },
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "dimension.parameter-cycle" }),
    );
  });
});
