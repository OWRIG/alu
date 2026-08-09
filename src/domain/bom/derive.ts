import { compareCanonicalText, quantizeMm } from "../project/canonical";
import { computeBomHash } from "../project/hash";
import { partKey } from "../project/parse";
import type { ProfileBomLine, ProjectDocumentV1 } from "../project/schema";

export type DerivedProfileBom = {
  lines: ProfileBomLine[];
  bomHash: string;
};

export function deriveProfileBom(project: ProjectDocumentV1): DerivedProfileBom {
  const groups = new Map<string, ProfileBomLine>();
  for (const profile of Object.values(project.entities)) {
    const definition =
      project.embeddedParts[partKey(profile.definitionRef.partId, profile.definitionRef.revision)]
        ?.definition;
    if (!definition) continue;
    const aggregateKey = [
      profile.definitionRef.partId,
      profile.definitionRef.revision,
      quantizeMm(profile.lengthMm).toFixed(2),
      profile.rotationAroundAxisDeg,
      profile.purpose,
    ].join("|");
    const existing = groups.get(aggregateKey);
    if (existing) {
      existing.quantity += 1;
      existing.sourceEntityIds.push(profile.id);
      existing.sourceEntityIds.sort(compareCanonicalText);
    } else {
      groups.set(aggregateKey, {
        aggregateKey,
        definitionRef: profile.definitionRef,
        definitionName: definition.name,
        lengthMm: quantizeMm(profile.lengthMm),
        rotationAroundAxisDeg: profile.rotationAroundAxisDeg,
        purpose: profile.purpose,
        quantity: 1,
        sourceEntityIds: [profile.id],
      });
    }
  }

  const lines = [...groups.values()].sort((left, right) => {
    return (
      compareCanonicalText(left.definitionName, right.definitionName) ||
      left.lengthMm - right.lengthMm ||
      left.rotationAroundAxisDeg - right.rotationAroundAxisDeg ||
      compareCanonicalText(left.purpose, right.purpose) ||
      compareCanonicalText(left.definitionRef.partId, right.definitionRef.partId)
    );
  });
  return { lines, bomHash: computeBomHash(lines) };
}
