import { describe, expect, it } from "vitest";

import { deriveProfileBom } from "../bom/derive";
import {
  createBlankProject,
  GENERIC_PROFILE_DEFINITIONS,
  snapshotDefinition,
} from "../project/defaults";
import { DomainError } from "../project/error";
import { evaluateRules } from "../rules/evaluate";
import { loadOverbedFixture } from "../../test-support/fixture";
import { applyCommandEnvelope, createCommandEnvelope } from "./apply";

describe("domain commands", () => {
  it("C-add-profile and C-profile-axis-orientation create one explicit model entity", () => {
    const project = createBlankProject({
      projectId: "project.add-profile",
      now: "2026-08-09T00:00:00.000Z",
    });
    const definition = GENERIC_PROFILE_DEFINITIONS[2];
    const added = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [
          {
            type: "profile.add",
            definitionSnapshot: snapshotDefinition(definition),
            profile: {
              id: "profile.test-member",
              kind: "profile",
              definitionRef: { partId: definition.id, revision: definition.revision },
              origin: { x: 10.126, y: 20, z: 30 },
              axis: "y",
              lengthMm: 600.126,
              rotationAroundAxisDeg: 90,
              purpose: "test-member",
              endCutA: { kind: "square" },
              endCutB: { kind: "square" },
            },
          },
        ],
        "command.add-profile",
      ),
    );

    expect(added.entities["profile.test-member"]).toMatchObject({
      axis: "y",
      lengthMm: 600.13,
      origin: { x: 10.13, y: 20, z: 30 },
      rotationAroundAxisDeg: 90,
    });
    expect(deriveProfileBom(added).lines[0]).toMatchObject({ lengthMm: 600.13, quantity: 1 });

    const removed = applyCommandEnvelope(
      added,
      createCommandEnvelope(
        added,
        [{ type: "entity.remove", entityId: "profile.test-member" }],
        "command.remove-profile",
      ),
    );
    expect(removed.entities).toEqual({});
    expect(removed.embeddedParts).toEqual({});
  });

  it("C-invalid-profile-length rejects zero without changing the project", () => {
    const project = loadOverbedFixture();
    expect(() =>
      applyCommandEnvelope(project, {
        commandVersion: 1,
        commandId: "command.invalid-length",
        expectedProjectRevision: project.revision,
        commands: [
          {
            type: "profile.update",
            entityId: "profile.top-front",
            patch: { lengthMm: 0 },
          },
        ],
      } as never),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "command.schema-invalid" }),
    );
    expect(project.entities["profile.top-front"].lengthMm).toBe(2230);
  });

  it("C-param-binding-sync updates derived fields as one revision", () => {
    const project = loadOverbedFixture();
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [{ type: "parameters.set", values: { bedOuterWidth: 2200 } }],
        "command.binding-sync",
      ),
    );
    expect(next.revision).toBe(project.revision + 1);
    expect(next.entities["profile.top-front"].lengthMm).toBe(2330);
    expect(next.entities["profile.top-rear"].lengthMm).toBe(2330);
    expect(deriveProfileBom(next).lines).toEqual([
      expect.objectContaining({ lengthMm: 2330, quantity: 2 }),
    ]);
  });

  it("C-param-manual-override-stale preserves a manual override", () => {
    const project = loadOverbedFixture();
    const overridden = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [
          {
            type: "profile.update",
            entityId: "profile.top-front",
            patch: { lengthMm: 2222 },
          },
        ],
        "command.override",
      ),
    );
    const next = applyCommandEnvelope(
      overridden,
      createCommandEnvelope(
        overridden,
        [{ type: "parameters.set", values: { bedOuterWidth: 2200 } }],
        "command.parameter-after-override",
      ),
    );
    expect(next.entities["profile.top-front"].lengthMm).toBe(2222);
    expect(next.entities["profile.top-rear"].lengthMm).toBe(2330);
    expect(
      evaluateRules(next).some((finding) => finding.ruleId === "dimension.parameter-binding-stale"),
    ).toBe(true);
  });

  it("resynchronizes a stale binding", () => {
    const project = loadOverbedFixture();
    const overridden = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [
          {
            type: "profile.update",
            entityId: "profile.top-front",
            patch: { lengthMm: 2000 },
          },
        ],
        "command.override-for-resync",
      ),
    );
    const resynced = applyCommandEnvelope(
      overridden,
      createCommandEnvelope(
        overridden,
        [{ type: "binding.resync", entityId: "profile.top-front", field: "lengthMm" }],
        "command.resync",
      ),
    );
    expect(resynced.entities["profile.top-front"].lengthMm).toBe(2230);
  });

  it("C-agent-command-batch-atomic leaves the input untouched on failure", () => {
    const project = loadOverbedFixture();
    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(
          project,
          [
            {
              type: "profile.update",
              entityId: "profile.top-front",
              patch: { lengthMm: 2000 },
            },
            { type: "entity.remove", entityId: "profile.missing" },
          ],
          "command.atomic",
        ),
      ),
    ).toThrowError(expect.objectContaining<Partial<DomainError>>({ code: "ref.entity-missing" }));
    expect(project.entities["profile.top-front"].lengthMm).toBe(2230);
    expect(project.revision).toBe(0);
  });

  it("rejects stale revisions instead of silently retrying", () => {
    const project = loadOverbedFixture();
    const envelope = createCommandEnvelope(
      project,
      [{ type: "parameters.set", values: { bedOuterWidth: 2200 } }],
      "command.retry",
    );
    const next = applyCommandEnvelope(project, envelope);
    expect(() => applyCommandEnvelope(next, envelope)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "revision.conflict" }),
    );
  });
});
