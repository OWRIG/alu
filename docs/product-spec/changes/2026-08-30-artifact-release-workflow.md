# artifact-release-workflow

> 状态：已交付；用户已确认本次 Skill 行为修正。

## Why

`design-with-alu` 原工作流在 `validate` 后默认执行 `export` 并返回 handoff，默认提示也直接要求输出最终 Markdown。这会把仍在修改、尚未人工确认的评审内容过早包装成对外效果图或工程文件。

## Delta

### CHANGED `skill.artifact-lifecycle`

- 设计阶段默认只保存 `.alu`、界面预览和聊天摘要，不把完成一次修改解释为发布授权。
- 用户明确要求评审文件或图片时可以生成预览，但文件名和可见内容必须标注 `review` 或“概念稿 / 不可下单”。
- 对外效果图、产品页、Markdown/PDF/JSON 交付单和采购文件统一归为正式发布产物。

### ADDED `skill.human-release-gate`

- 正式输出前必须通过 `order-ready`，并解决或由人明确接受剩余 warning。
- Agent 展示当前 revision/designHash 与边界，等待人明确确认该版本冻结；普通的“完成”“打开看看”或历史授权不算确认。
- 确认后立即再次 read/validate；身份改变即撤销确认并回到评审。
- 正式导出后记录 BOM hash。任何后续工程修改都会使确认和旧发布产物失效，不得静默覆盖或继续当作当前版本。

### CHANGED `skill.capability-boundary`

- 明确 ALU v0.2 的 `order-ready` 只是自动校验，`export` 只是报告渲染。
- 当前没有持久化 release 状态、批准人或旧文件自动作废能力；本轮由 Skill 强制人工停顿，不虚构产品能力。

## Not in this change

- 不新增 ALU 领域 schema、release 命令、批准记录或 GUI 发布按钮。
- 不改变 JSON/Markdown/PDF 报告模型与现有 CLI 参数。
- 不删除或改写此前已生成的历史评审文件。

## Cases

- `C-no-implicit-final-export`：普通创建、修改、校验和查看请求结束时不自动生成正式产物。
- `C-review-preview-marked`：人工要求的评审文件带 review/不可下单标识。
- `C-order-ready-is-not-approval`：通过 `order-ready` 后仍停在人工确认点。
- `C-release-identity-recheck`：确认后身份变化会取消发布。
- `C-edit-invalidates-release`：发布后的任何工程修改要求新版本重新校验和确认。

## Verification

- 源 Skill 与当前安装副本均通过官方 validator；四项行为文件逐字一致，安装副本的 ALU CLI 启动器通过 `help` smoke。
- Codex integration installer 聚焦测试 2/2 通过，import boundary check 通过。
- 本次十个 Markdown/YAML 文件的格式检查与 `git diff --check` 通过。
- 人工核对入口描述、默认提示、主工作流、能力边界和 CLI 参考不存在默认正式导出路径。

## Docs impact

同步中英文 README、Agent Skill 架构说明与 Headless CLI 产品规范。
