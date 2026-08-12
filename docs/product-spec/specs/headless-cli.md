# Headless CLI

## 当前行为

`alu` 核心是 Electron 无关的单文件 Node.js CLI。已安装的 `ALU.app` 通过 `--cli` 暴露同一入口，并只为 PDF 增加 Electron 打印适配；领域协议、报告模型和 Markdown 渲染仍共用，不建立第二套业务 API。

| 命令            | 行为                                                         |
| --------------- | ------------------------------------------------------------ |
| `create FILE`   | 从 blank 或 demo 模板创建 `.alu`；已有文件一律拒绝覆盖       |
| `read FILE`     | 返回工程身份、完整工程、参数求值、BOM、规则与梁选型结果      |
| `validate FILE` | 按 `edit`、`order-draft` 或 `order-ready` 判断是否可继续     |
| `dry-run FILE`  | 校验命令批并返回实体、参数、BOM、规则差异，不写文件          |
| `apply FILE`    | 在文件锁内重读、校验 revision/designHash、整批执行并原子替换 |
| `export FILE`   | 生成 versioned report JSON，并输出 JSON、Markdown 或品牌 PDF |
| `schema`        | 从 Zod 生成工程/命令 JSON Schema，并返回内置型材 snapshot    |

所有调用只向 stdout 写一个 JSON 对象。成功形状为 `{ ok: true, command, data }`；失败形状为 `{ ok: false, command, error }`。`error` 至少包含稳定 `code` 与 `message`，可附带 JSON Pointer、失败的 `commandIndex`、实体 ID 和修复建议。

## 写入协议

命令信封固定为 `commandVersion: 1`，并包含：

- 调用方生成的 `commandId`；
- 最近一次 `read` 返回的 `expectedProjectRevision`；
- 最近一次 `read` 返回的 `expectedDesignHash`；
- 1–1000 条 `commands`。

`dry-run` 与 `apply` 调用同一个 `applyCommandEnvelope`。任一命令失败时整批不写入；同 revision 但设计内容漂移也以 `design.conflict` 拒绝。`commandId` 只做请求关联，不持久化去重。响应丢失后应重新读取并比较结果，不能盲目重复或强制覆盖。

CLI 与桌面端共用 `<project>.alu.lock`。锁记录 PID、时间和随机 token。活锁拒绝并发写；死进程遗留锁返回 `project.stale-lock`，不会用有竞态的自动删除冒险放进第二个写入者。调用方确认 PID 已退出后才能删除该明确锁文件。桌面端保存已有工程还会校验打开时的 fileHash，外部写入后拒绝静默覆盖并要求重新打开。

## 工程交付

`alu export` 先生成 `reportVersion: 1` 的标准 JSON，包含工程身份、目标校验状态、参数尺寸链、型材材料与切料、梁选型摘要、finding 和能力边界。JSON、Markdown 与 PDF 都消费这份模型；PDF 使用随 Skill 分发的 ALU 标识和应用内打印适配。

默认格式按输出扩展名推断：`.json`、`.pdf`，其他扩展名默认 Markdown。调用方必须提供 `--output`，且输出路径不能与源 `.alu` 相同。独立 Node CLI 支持 JSON/Markdown；PDF 必须通过已安装应用的 Skill 启动器执行。

## 退出码

| Code | 含义                              |
| ---: | --------------------------------- |
|    0 | 命令完成                          |
|    1 | I/O 或未预期内部失败              |
|    2 | 参数、JSON、schema 或输入文件无效 |
|    3 | 领域命令被拒绝                    |
|    4 | revision、design、文件或锁冲突    |
|    5 | 校验完成，但所选目标被规则阻断    |

## Cases

| Case                               | 已验证结果                                                      |
| ---------------------------------- | --------------------------------------------------------------- |
| `C-agent-command-schema`           | 未知版本、未知字段和无效命令在写文件前拒绝                      |
| `C-agent-command-preview`          | dry-run 返回确定性的实体、参数、BOM 与规则差异                  |
| `C-agent-command-batch-atomic`     | 批内后续命令失败时，文件字节保持不变                            |
| `C-agent-retry-revision-safe`      | 原信封重试收到 revision 冲突，不重复执行                        |
| `C-agent-design-hash-safe`         | revision 未变但内容漂移时收到 design 冲突                       |
| `C-cli-machine-output`             | 成功与失败都只输出一个 JSON 对象并使用固定退出码                |
| `C-cli-create-no-overwrite`        | create 不覆盖已有 `.alu`                                        |
| `C-cli-shared-file-lock`           | 活锁拒绝并发写；死进程遗留锁明确报错且不自动删除                |
| `C-agent-skill-smoke`              | create → read → dry-run → apply → readback 在构建产物上执行通过 |
| `C-desktop-external-save-conflict` | CLI 修改后，桌面端旧 fileHash 保存被拒绝                        |
| `C-handoff-versioned-json`         | JSON、Markdown 与 PDF 共用 reportVersion 1 和相同 BOM/finding   |
| `C-handoff-branded-pdf`            | 真实 ALU.app 输出带标识、中文表格、边界和页码的 A4 PDF          |
