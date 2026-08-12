import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { previewCommandEnvelope, projectIdentity } from "../domain/commands/preview";
import { CommandEnvelopeSchema, type CommandEnvelope } from "../domain/commands/schema";
import {
  createBlankProject,
  createParametricClearanceFrameDemo,
  GENERIC_PROFILE_DEFINITIONS,
  snapshotDefinition,
} from "../domain/project/defaults";
import { asDomainError, DomainError } from "../domain/project/error";
import { inspectProject, validateProject } from "../domain/project/inspect";
import { ProjectDocumentV1Schema, type ProjectDocumentV1 } from "../domain/project/schema";
import {
  buildProjectHandoff,
  renderProjectHandoffHtml,
  renderProjectHandoffMarkdown,
} from "../domain/report/handoff";
import type { ValidationTarget } from "../domain/rules/evaluate";
import {
  createProjectFileAtomic,
  mutateProjectFileAtomic,
  readProjectFile,
} from "../node/project-file";
import { writeOutputFileAtomic } from "../node/output-file";

const MAX_COMMAND_BYTES = 8 * 1024 * 1024;
const VALIDATION_TARGETS = new Set<ValidationTarget>(["edit", "order-draft", "order-ready"]);

export const CLI_EXIT_CODES = {
  success: 0,
  internal: 1,
  input: 2,
  domain: 3,
  conflict: 4,
  validationBlocked: 5,
} as const;

export type CliResponse =
  | { ok: true; command: string; data: unknown }
  | {
      ok: false;
      command: string;
      error: {
        code: string;
        message: string;
        path?: string;
        entityIds?: string[];
        suggestion?: string;
        commandIndex?: number;
      };
    };

export type CliRunResult = { exitCode: number; response: CliResponse };

export type CliDependencies = {
  readStdin: () => Promise<string>;
  now?: () => Date;
  reportLogoDataUrl?: string;
  renderPdf?: (input: { html: string; title: string; footerText: string }) => Promise<Uint8Array>;
};

type ParsedArguments = { positionals: string[]; options: Map<string, string> };

const HELP = {
  usage: [
    "alu create FILE [--name NAME] [--project-id ID] [--template blank|demo]",
    "alu read FILE",
    "alu validate FILE [--target edit|order-draft|order-ready]",
    "alu dry-run FILE --input FILE|- [--target edit|order-draft|order-ready]",
    "alu apply FILE --input FILE|- [--target edit|order-draft|order-ready]",
    "alu export FILE --output FILE [--format json|md|pdf] [--target edit|order-draft|order-ready]",
    "alu schema [project|command|all]",
  ],
  notes: [
    "Every invocation writes exactly one JSON response to stdout.",
    "Use schema command to obtain JSON Schema and built-in profile snapshots.",
    "Use read -> dry-run -> apply; never edit .alu JSON directly.",
    "Use export for the versioned JSON model, Markdown handoff, or packaged-app PDF.",
  ],
  exitCodes: CLI_EXIT_CODES,
};

function success(
  command: string,
  data: unknown,
  exitCode: number = CLI_EXIT_CODES.success,
): CliRunResult {
  return { exitCode, response: { ok: true, command, data } };
}

function parseArguments(tokens: string[], allowedOptions: string[]): ParsedArguments {
  const allowed = new Set(allowedOptions);
  const positionals: string[] = [];
  const options = new Map<string, string>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const name = token.slice(2);
    if (!allowed.has(name)) {
      throw new DomainError({
        code: "cli.invalid-arguments",
        message: `不支持的选项 --${name}`,
        suggestion: "运行 alu help 查看命令格式",
      });
    }
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new DomainError({
        code: "cli.invalid-arguments",
        message: `选项 --${name} 缺少值`,
      });
    }
    if (options.has(name)) {
      throw new DomainError({
        code: "cli.invalid-arguments",
        message: `选项 --${name} 不能重复`,
      });
    }
    options.set(name, value);
    index += 1;
  }
  return { positionals, options };
}

function requirePositionals(command: string, positionals: string[], count: number): void {
  if (positionals.length !== count) {
    throw new DomainError({
      code: "cli.invalid-arguments",
      message: `${command} 需要 ${count} 个位置参数，实际收到 ${positionals.length} 个`,
      suggestion: "运行 alu help 查看命令格式",
    });
  }
}

function validationTarget(value: string | undefined): ValidationTarget {
  const target = value ?? "edit";
  if (!VALIDATION_TARGETS.has(target as ValidationTarget)) {
    throw new DomainError({
      code: "cli.invalid-arguments",
      message: `不支持的校验目标 ${target}`,
      suggestion: "使用 edit、order-draft 或 order-ready",
    });
  }
  return target as ValidationTarget;
}

type ExportFormat = "json" | "md" | "pdf";

function exportFormat(value: string | undefined, outputPath: string): ExportFormat {
  const extension = path.extname(outputPath).toLowerCase();
  const format = value ?? (extension === ".pdf" ? "pdf" : extension === ".json" ? "json" : "md");
  if (!new Set<ExportFormat>(["json", "md", "pdf"]).has(format as ExportFormat)) {
    throw new DomainError({
      code: "report.format-invalid",
      message: `不支持的交付格式 ${format}`,
      suggestion: "使用 json、md 或 pdf",
    });
  }
  return format as ExportFormat;
}

function jsonPointer(pathItems: PropertyKey[]): string | undefined {
  if (pathItems.length === 0) return undefined;
  return `/${pathItems
    .map((item) => String(item).replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
}

async function readCommandSource(input: string, dependencies: CliDependencies): Promise<string> {
  let source: string;
  try {
    if (input === "-") {
      source = await dependencies.readStdin();
    } else {
      const inputStat = await stat(input);
      if (!inputStat.isFile()) {
        throw new DomainError({
          code: "command.input-not-file",
          message: `命令输入路径不是文件：${input}`,
        });
      }
      if (inputStat.size > MAX_COMMAND_BYTES) {
        throw new DomainError({
          code: "command.input-too-large",
          message: "命令输入超过 8 MiB 上限",
        });
      }
      source = await readFile(input, "utf8");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DomainError({
        code: "command.input-not-found",
        message: `找不到命令输入文件 ${input}`,
      });
    }
    throw error;
  }
  if (new TextEncoder().encode(source).length > MAX_COMMAND_BYTES) {
    throw new DomainError({
      code: "command.input-too-large",
      message: "命令输入超过 8 MiB 上限",
    });
  }
  return source;
}

async function readCommandEnvelope(
  input: string,
  dependencies: CliDependencies,
): Promise<CommandEnvelope> {
  const source = await readCommandSource(input, dependencies);
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new DomainError({
      code: "command.invalid-json",
      message: "命令输入不是有效 JSON",
    });
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "commandVersion" in value &&
    value.commandVersion !== 1
  ) {
    throw new DomainError({
      code: "command.version-unsupported",
      message: `不支持 commandVersion ${JSON.stringify(value.commandVersion)}`,
      path: "/commandVersion",
      suggestion: "当前只支持 commandVersion 1",
    });
  }
  const parsed = CommandEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DomainError({
      code: "command.schema-invalid",
      message: issue?.message ?? "命令格式无效",
      path: issue ? jsonPointer(issue.path) : undefined,
      suggestion: "运行 alu schema command 获取当前命令 schema",
    });
  }
  return parsed.data;
}

function fileIdentity(project: ProjectDocumentV1, fileHash: string) {
  return { ...projectIdentity(project), fileHash };
}

function createProject(
  template: string,
  options: { name?: string; projectId?: string; now: string },
): ProjectDocumentV1 {
  if (template !== "blank" && template !== "demo") {
    throw new DomainError({
      code: "cli.invalid-arguments",
      message: `不支持的模板 ${template}`,
      suggestion: "使用 blank 或 demo",
    });
  }
  const project =
    template === "demo"
      ? createParametricClearanceFrameDemo({ projectId: options.projectId, now: options.now })
      : createBlankProject({
          projectId: options.projectId,
          now: options.now,
          name: options.name,
        });
  return options.name ? { ...project, meta: { ...project.meta, name: options.name } } : project;
}

function exitCodeFor(error: DomainError): number {
  if (
    error.code.startsWith("cli.") ||
    error.code.startsWith("schema.") ||
    error.code === "project.invalid-json" ||
    error.code === "project.file-too-large" ||
    error.code.startsWith("command.invalid-") ||
    error.code === "command.input-too-large" ||
    error.code === "command.input-not-found" ||
    error.code === "command.input-not-file" ||
    error.code === "command.schema-invalid" ||
    error.code === "command.version-unsupported" ||
    error.code.startsWith("report.") ||
    error.code === "file.not-found" ||
    error.code === "file.not-file" ||
    error.code === "file.directory-missing"
  ) {
    return CLI_EXIT_CODES.input;
  }
  if (
    error.code === "revision.conflict" ||
    error.code === "design.conflict" ||
    error.code === "file.conflict" ||
    error.code === "file.exists" ||
    error.code === "project.locked" ||
    error.code === "project.stale-lock"
  ) {
    return CLI_EXIT_CODES.conflict;
  }
  if (error.code === "internal.unexpected" || error.code.startsWith("file.")) {
    return CLI_EXIT_CODES.internal;
  }
  return CLI_EXIT_CODES.domain;
}

async function execute(
  command: string,
  tokens: string[],
  dependencies: CliDependencies,
): Promise<CliRunResult> {
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      requirePositionals("help", tokens, 0);
      return success("help", HELP);
    case "create": {
      const args = parseArguments(tokens, ["name", "project-id", "template"]);
      requirePositionals(command, args.positionals, 1);
      const filePath = args.positionals[0];
      const defaultName = path.basename(filePath, path.extname(filePath));
      const now = (dependencies.now?.() ?? new Date()).toISOString();
      const template = args.options.get("template") ?? "blank";
      const project = createProject(template, {
        name: args.options.get("name") ?? defaultName,
        projectId: args.options.get("project-id"),
        now,
      });
      const saved = await createProjectFileAtomic(filePath, project, now);
      return success(command, {
        identity: fileIdentity(saved.project, saved.fileHash),
        template,
        validation: validateProject(saved.project, "edit"),
      });
    }
    case "read": {
      const args = parseArguments(tokens, []);
      requirePositionals(command, args.positionals, 1);
      const opened = await readProjectFile(args.positionals[0]);
      return success(command, {
        identity: fileIdentity(opened.project, opened.fileHash),
        bomDrift: opened.bomDrift,
        project: opened.project,
        ...inspectProject(opened.project),
      });
    }
    case "validate": {
      const args = parseArguments(tokens, ["target"]);
      requirePositionals(command, args.positionals, 1);
      const target = validationTarget(args.options.get("target"));
      const opened = await readProjectFile(args.positionals[0]);
      const validation = validateProject(opened.project, target);
      return success(
        command,
        {
          identity: fileIdentity(opened.project, opened.fileHash),
          bomDrift: opened.bomDrift,
          validation,
        },
        validation.canProceed ? CLI_EXIT_CODES.success : CLI_EXIT_CODES.validationBlocked,
      );
    }
    case "dry-run": {
      const args = parseArguments(tokens, ["input", "target"]);
      requirePositionals(command, args.positionals, 1);
      const input = args.options.get("input");
      if (!input) {
        throw new DomainError({
          code: "cli.invalid-arguments",
          message: "dry-run 需要 --input FILE|-",
        });
      }
      const [opened, envelope] = await Promise.all([
        readProjectFile(args.positionals[0]),
        readCommandEnvelope(input, dependencies),
      ]);
      const preview = previewCommandEnvelope(opened.project, envelope);
      const target = validationTarget(args.options.get("target"));
      return success(command, {
        before: fileIdentity(opened.project, opened.fileHash),
        after: preview.after,
        diff: preview.diff,
        validation: validateProject(preview.project, target),
      });
    }
    case "apply": {
      const args = parseArguments(tokens, ["input", "target"]);
      requirePositionals(command, args.positionals, 1);
      const input = args.options.get("input");
      if (!input) {
        throw new DomainError({
          code: "cli.invalid-arguments",
          message: "apply 需要 --input FILE|-",
        });
      }
      const envelope = await readCommandEnvelope(input, dependencies);
      const target = validationTarget(args.options.get("target"));
      const saved = await mutateProjectFileAtomic(
        args.positionals[0],
        (opened) => {
          const preview = previewCommandEnvelope(opened.project, envelope);
          return {
            project: preview.project,
            result: {
              before: fileIdentity(opened.project, opened.fileHash),
              diff: preview.diff,
              validation: validateProject(preview.project, target),
            },
          };
        },
        (dependencies.now?.() ?? new Date()).toISOString(),
      );
      return success(command, {
        ...saved.result,
        after: fileIdentity(saved.project, saved.fileHash),
      });
    }
    case "export": {
      const args = parseArguments(tokens, ["output", "format", "target"]);
      requirePositionals(command, args.positionals, 1);
      const projectPath = path.resolve(args.positionals[0]);
      const output = args.options.get("output");
      if (!output) {
        throw new DomainError({
          code: "cli.invalid-arguments",
          message: "export 需要 --output FILE",
        });
      }
      const outputPath = path.resolve(output);
      if (outputPath === projectPath) {
        throw new DomainError({
          code: "report.output-conflicts-project",
          message: "交付文件不能覆盖源 .alu 工程",
          suggestion: "为 --output 使用不同的文件名",
        });
      }
      const format = exportFormat(args.options.get("format"), outputPath);
      const target = validationTarget(args.options.get("target"));
      const opened = await readProjectFile(projectPath);
      const report = buildProjectHandoff(opened.project, target);
      let contents: string | Uint8Array;
      if (format === "json") {
        contents = `${JSON.stringify(report, null, 2)}\n`;
      } else if (format === "md") {
        contents = renderProjectHandoffMarkdown(report);
      } else {
        if (!dependencies.renderPdf || !dependencies.reportLogoDataUrl) {
          throw new DomainError({
            code: "report.pdf-unavailable",
            message: "当前 CLI 运行时不支持 PDF 渲染",
            suggestion: "使用已安装 ALU.app 的 Skill 启动器，或改为 --format md",
          });
        }
        contents = await dependencies.renderPdf({
          html: renderProjectHandoffHtml(report, {
            logoDataUrl: dependencies.reportLogoDataUrl,
          }),
          title: `${report.project.name} · ALU 工程交付单`,
          footerText: `ALU · ${report.project.name}`,
        });
      }
      await writeOutputFileAtomic(outputPath, contents);
      return success(command, {
        format,
        outputPath,
        identity: fileIdentity(opened.project, opened.fileHash),
        reportVersion: report.reportVersion,
        bomHash: report.bomHash,
        materialLineCount: report.materials.length,
        validation: report.validation,
      });
    }
    case "schema": {
      const args = parseArguments(tokens, []);
      if (args.positionals.length > 1) {
        throw new DomainError({
          code: "cli.invalid-arguments",
          message: "schema 最多接受一个类型参数",
        });
      }
      const target = args.positionals[0] ?? "all";
      if (!["project", "command", "all"].includes(target)) {
        throw new DomainError({
          code: "cli.invalid-arguments",
          message: `不支持的 schema 类型 ${target}`,
          suggestion: "使用 project、command 或 all",
        });
      }
      return success(command, {
        commandVersion: 1,
        ...(target === "command" || target === "all"
          ? {
              command: z.toJSONSchema(CommandEnvelopeSchema),
              builtInProfileSnapshots: GENERIC_PROFILE_DEFINITIONS.map(snapshotDefinition),
            }
          : {}),
        ...(target === "project" || target === "all"
          ? { project: z.toJSONSchema(ProjectDocumentV1Schema) }
          : {}),
        exitCodes: CLI_EXIT_CODES,
      });
    }
    default:
      throw new DomainError({
        code: "cli.command-unknown",
        message: `未知命令 ${command}`,
        suggestion: "运行 alu help 查看支持的命令",
      });
  }
}

export async function runCli(argv: string[], dependencies: CliDependencies): Promise<CliRunResult> {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const command = normalizedArgv[0] ?? "help";
  try {
    return await execute(command, normalizedArgv.slice(1), dependencies);
  } catch (error) {
    const domainError = asDomainError(error);
    return {
      exitCode: exitCodeFor(domainError),
      response: {
        ok: false,
        command,
        error: {
          code: domainError.code,
          message: domainError.message,
          ...(domainError.path ? { path: domainError.path } : {}),
          ...(domainError.entityIds ? { entityIds: domainError.entityIds } : {}),
          ...(domainError.suggestion ? { suggestion: domainError.suggestion } : {}),
          ...(domainError.commandIndex === undefined
            ? {}
            : { commandIndex: domainError.commandIndex }),
        },
      },
    };
  }
}
