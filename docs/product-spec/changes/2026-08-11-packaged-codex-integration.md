# packaged-codex-integration

> 状态：已批准。

## Why

当前 `design-with-alu` 已经使用 Headless CLI 编排 `.alu`，但只在源码环境或手动全局链接 CLI 后可用。DMG 安装的 `ALU.app` 没有暴露可调用入口，也不会把 Skill 放进 Codex 的用户级发现目录，因此“安装 ALU 后让 Codex 直接设计”还没有闭环。

## Delta

### ADDED `distribution.packaged-headless-cli`

- `C-packaged-cli-no-node` 已安装的 `ALU.app` 可通过应用自身的 headless 模式执行 `create`、`read`、`schema`、`dry-run`、`apply` 与 `validate`，不要求用户另外安装 Node.js、pnpm 或源码仓库。
- `C-packaged-cli-json-contract` 应用 headless 模式沿用现有 CLI 的单行 JSON、稳定错误码和退出码，不启动编辑器窗口。
- `C-packaged-cli-security-boundary` 发布包继续关闭 Electron RunAsNode、`NODE_OPTIONS` 与 CLI inspect；headless 模式只调用版本化 ALU 命令协议，不提供任意脚本执行入口。

### ADDED `distribution.codex-integration-installer`

- `C-codex-install-consent` 首次打开已安装的 ALU 且尚未配置接入时，先询问是否安装 Codex 接入；拒绝后不重复打扰，用户仍可从 ALU 应用菜单手动安装。
- `C-codex-install-complete` 一次安装同时写入 `design-with-alu` 与三项配套 Skill 到 `~/.agents/skills`，并在主 Skill 内生成指向当前 `ALU.app` 的启动器。
- `C-codex-install-managed-update` 重新安装或升级只替换带 ALU 管理标记的 Skill；发现同名但非 ALU 管理的目录时拒绝覆盖，并给出具体冲突路径。
- `C-codex-install-relocatable` 启动器记录实际应用路径，不假设 ALU 一定安装在 `/Applications`；应用被移动后可从新位置重新运行安装动作修复入口。
- `C-codex-install-discoverable` 安装完成提示 Codex 会自动发现 Skill；若当前会话没有出现，可重启 Codex 后使用 `$design-with-alu`。

### CHANGED `agent.skill-cli-resolution`

- `design-with-alu` 优先使用随 Skill 安装的启动器，再回退到 PATH 中的 `alu` 或源码环境的 `pnpm cli`。
- README 的默认教程改为“安装 ALU → 首次启动安装 Codex 接入 → 在 Codex 调用 `$design-with-alu`”；源码构建只保留为开发者路径。

### ADDED `agent.project-handoff`

- `C-handoff-versioned-json` ALU 先生成 `reportVersion: 1` 的标准工程交付 JSON；Markdown 与 PDF 都只消费这份模型，不从 `.alu` 各自拼装内容。
- `C-handoff-markdown-default` 设计收尾默认输出一份 UTF-8 Markdown 工程交付单，包含工程身份、校验状态、关键尺寸链、型材材料与切料清单、梁选型摘要、未解决检查和能力边界。
- `C-handoff-single-source` Markdown 与 PDF 使用同一份确定性报告模型；PDF 不能遗漏 Markdown 中的阻断项或把未建模材料补成推测数量。
- `C-handoff-branded-pdf` 用户明确需要时可额外输出 A4 PDF，使用 ALU 标识、克制的黑白灰与蓝色强调、清晰表格和页码。
- `C-handoff-explicit-output` `alu export` 只写入调用方通过 `--output` 指定的 JSON、Markdown 或 PDF 文件，并在 stdout JSON 响应中返回格式、路径、工程身份和校验结果。

## Non-goals

- 不增加 MCP server、后台服务、网络端口或内置模型调用。
- 不自动提交订单，也不扩大当前 `.alu`、BOM 与结构校验边界。
- 本轮只保证 macOS Apple Silicon 安装包；Windows 与其他架构仍按路线图推进。
- 不把 Skill 安装包装成公开 Codex Plugin；公开分发可在本地链路稳定后单独处理。
- 不把当前型材切料清单冒充完整采购 BOM；连接件、加工、紧固件、脚轮、板材和附件继续明确标为未覆盖。

## Verification

- 纯 Node 测试覆盖 Skill 安装、受管更新、同名目录冲突与实际应用路径启动器。
- 真实打包 smoke 从 `ALU.app` 执行 Headless CLI，完成 create → read → dry-run → apply → validate。
- 报告 contract test 核对 Markdown/PDF 共用的工程身份、材料行、校验状态与边界说明；真实 PDF 渲染后检查分页、中文、表格和 ALU 标识。
- 包内容检查确认四项 Skill 位于受控 extra resources，ASAR 安全边界与 Electron fuses 不回退。
- 人工验收首次提示、拒绝后不重复提示、应用菜单重新安装与 Codex Skill 发现。
