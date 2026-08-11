# headless-agent-interface

> 状态：已批准；Headless CLI 核心、Skill 闭环与桌面保存冲突保护已实现。目录搜索、运行中主动重载提示和 live attach 仍后续。

## Why

在不增加模型服务、网络端口或第二套业务 API 的前提下，让外部 agent 通过 headless CLI 安全读写 `.alu` 工程。

## Delta

### ADDED `agent.versioned-commands`

- `C-agent-command-schema` 非法命令在改动工程前被 Zod 拒绝。
- `C-agent-command-error-structured` [error] 拒绝返回稳定错误码、JSON Pointer、相关实体和修复方向。
- `C-agent-command-preview` 命令批 dry-run 返回实体、参数、规则和 BOM 差异。
- `C-agent-command-batch-atomic` [boundary] 批量命令任一条失败，整批不落地。
- `C-agent-client-entity-id` 新增类命令由调用方提供实体 ID，同批后续命令可引用。
- `C-agent-command-undo` 已执行命令批与人工操作共用撤销历史，一批一步撤销。
- `C-agent-retry-revision-safe` [boundary] 响应丢失后的重试不会静默重复应用；revision 冲突要求调用方重新读取项目和设计哈希。
- `C-agent-design-hash-safe` [boundary] revision 未变但设计内容漂移时拒绝写入。

### ADDED `agent.headless-cli-and-skill`

- `C-cli-ui-design-hash-parity` 同一初始设计哈希和同一命令批经 UI 与 CLI 执行，得到相同最终设计哈希。
- `C-cli-machine-output` CLI 成功与错误均使用稳定退出码和结构化 JSON。
- `C-agent-skill-smoke` 配套 Skill 的“读 → dry-run → apply → 读回”示例在 CI 冒烟测试中可执行。
- `C-desktop-external-save-conflict` 应用保存已打开工程时校验旧 fileHash；被 CLI 修改后拒绝覆盖并要求重新打开。

## Non-goals

- 不承诺 `commandId` 的跨进程持久幂等；P4 使用 `expectedProjectRevision` 与 `expectedDesignHash` 防止静默重复写入。
- 不实现 MCP server、内置聊天界面、模型 API 管理或 live attach。

## Verification

CLI contract test、Skill 冒烟测试、共享文件层测试和 UI/CLI 设计哈希一致性测试全部通过后，才把对应能力写入当前行为 spec。
