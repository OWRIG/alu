import { describe, expect, it } from "vitest";

import { canonicalStringify, quantizeMm } from "./canonical";
import { computeDesignHash, computeFileHash, sha256Hex } from "./hash";
import { loadOverbedFixture } from "../../test-support/fixture";

describe("project hashing", () => {
  it("matches the SHA-256 reference vector", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("canonicalizes object keys and negative zero", () => {
    expect(canonicalStringify({ z: -0, a: { y: 2, x: 1 } })).toBe('{"a":{"x":1,"y":2},"z":0}');
    expect(canonicalStringify(JSON.parse('{"__proto__":{"safe":true},"a":1}'))).toBe(
      '{"__proto__":{"safe":true},"a":1}',
    );
    expect(quantizeMm(10.126)).toBe(10.13);
    expect(quantizeMm(-1.005)).toBe(-1.01);
  });

  it("keeps designHash stable across revision and save metadata changes", () => {
    const project = loadOverbedFixture();
    const changedMetadata = {
      ...project,
      revision: project.revision + 5,
      meta: { ...project.meta, updatedAt: "2026-08-10T00:00:00.000Z" },
    };
    expect(computeDesignHash(changedMetadata)).toBe(computeDesignHash(project));
    expect(computeFileHash(JSON.stringify(changedMetadata))).not.toBe(
      computeFileHash(JSON.stringify(project)),
    );
  });
});
