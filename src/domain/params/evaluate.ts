import { DomainError } from "../project/error";
import { quantizeMm } from "../project/canonical";
import type { ParameterSet } from "../project/schema";

export type EvaluatedParameters = Record<string, number>;

export function evaluateParameters(parameters: ParameterSet): EvaluatedParameters {
  const values: EvaluatedParameters = {};
  for (const [id, input] of Object.entries(parameters.inputs))
    values[id] = quantizeMm(input.valueMm);

  const pending = new Map(Object.entries(parameters.derived));
  while (pending.size > 0) {
    let progressed = false;
    for (const [id, definition] of pending) {
      const missing = definition.terms.find(
        (term) => !(term.param in values) && !pending.has(term.param),
      );
      if (missing) {
        throw new DomainError({
          code: "dimension.parameter-ref-missing",
          message: `参数 ${id} 引用了不存在的参数 ${missing.param}`,
          path: `/parameters/derived/${id}/terms`,
          suggestion: "补充被引用参数或修改派生公式",
        });
      }
      if (definition.terms.every((term) => term.param in values)) {
        const value = definition.terms.reduce(
          (sum, term) => sum + values[term.param] * term.coef,
          definition.constantMm,
        );
        values[id] = quantizeMm(value);
        pending.delete(id);
        progressed = true;
      }
    }
    if (!progressed) {
      const cycle = [...pending.keys()].sort();
      throw new DomainError({
        code: "dimension.parameter-cycle",
        message: `参数依赖成环：${cycle.join(" → ")}`,
        path: "/parameters/derived",
        suggestion: "移除环路中的一个反向依赖",
      });
    }
  }
  return values;
}
