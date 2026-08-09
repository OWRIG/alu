import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specRoot = path.join(projectRoot, "docs", "product-spec");
const changesRoot = path.join(specRoot, "changes");
const currentChangeName = "2026-08-09-bootstrap-mvp.md";
const requiredCurrentSpecs = [
  "editor.md",
  "project-file.md",
  "profile-bom.md",
  "engineering-rules.md",
];

const failures = [];
const changeNames = (await readdir(changesRoot)).filter(
  (name) => name.endsWith(".md") && name !== "README.md",
);
const caseOwners = new Map();

for (const name of changeNames) {
  const source = await readFile(path.join(changesRoot, name), "utf8");
  for (const caseId of source.match(/\bC-[a-z0-9-]+\b/g) ?? []) {
    const owner = caseOwners.get(caseId);
    if (owner && owner !== name) failures.push(`${caseId} 同时出现在 ${owner} 和 ${name}`);
    else caseOwners.set(caseId, name);
  }
}

const currentChange = await readFile(path.join(changesRoot, currentChangeName), "utf8");
if (!/> 状态：已实现，已验证。/.test(currentChange)) {
  failures.push(`${currentChangeName} 必须标记为“已实现，已验证”`);
}
if (/尚无|待实现|等待用户确认/.test(currentChange)) {
  failures.push(`${currentChangeName} 仍包含未完成状态`);
}
if (!/Tested build: `pnpm ready`/.test(currentChange)) {
  failures.push(`${currentChangeName} 缺少最终构建验证证据`);
}

for (const name of requiredCurrentSpecs) {
  try {
    const source = await readFile(path.join(specRoot, "specs", name), "utf8");
    if (!/^# /m.test(source) || !/C-[a-z0-9-]+/.test(source)) {
      failures.push(`specs/${name} 缺少标题或 case ID`);
    }
  } catch {
    failures.push(`缺少当前行为文档 specs/${name}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `Product spec gate failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`Product spec gate: OK (${caseOwners.size} unique cases)\n`);
}
