# context-and-rule-scope

> 状态：已完成。

## Why

`project.context` 有 6 个字段（`usage` / `humanLoad` / `childAccess` / `mobility` / `floor` / `loads`），但**没有任何写入路径**：无领域命令、无 IPC、无界面。它只在 `createBlankProject`（全部 `unknown`）和内置示例里各被设定过一次。

9 条规则里有 4 条依赖它，后果是一个两头都错的中间态：

| 规则                           | 依赖                                                    | 实际行为                                            |
| ------------------------------ | ------------------------------------------------------- | --------------------------------------------------- |
| `structure.mobile-side-sway`   | `mobility === "casters"`                                | 内置示例中从创建到删除永远亮着，用户无法消除        |
| `caster.wood-floor-soft-tread` | `+ floor === "wood"`                                    | 同上；建议动作文案里直接写着内部阶段号「P2」        |
| `motion.cable-routing-safe`    | `loads` 正则匹配 `/projector\|投影\|electrical\|电器/i` | 同上；且用自由文本正则触发工程规则                  |
| `safety.human-load-review`     | `humanLoad === true`                                    | 无写入路径且默认值不为 `true`，在应用内**永不触发** |

内置示例的 4 条检查结果里，3 条来自用户无法编辑的字段，没有一条来自用户正在编辑的几何。「检查 N」因此是一个不随设计变化的常数，用户会连同真正的阻断项一起忽略——过度提示的净效果是降低安全性，而不是提高。

`structure.long-span-review` 是另一种形态的同一问题：它的 message 说「需要挠度复核」，rationale 紧接着说「1500 mm 只是低置信度提醒阈值，不代表额定承载或结构不合格」。一句话制造焦虑，下一句撤回，且不提供任何路径。

## 第一性原理

- 规则只在用户能够输入、并且能够改变的数据上触发；不可编辑的输入不产生可见结论。
- 工程规则由结构化字段触发，不由自由文本的正则匹配触发。
- 每条提示必须对应一个用户在应用内可执行的动作；做不到的建议属于文档，不属于检查页。
- 提示与入口是两回事：需要计算才能回答的问题应给出计算入口，而不是给出一条自我否定的警告。
- 界面文案不暴露内部路线图阶段号。

## Delta

### ADDED `command.context.set`

- 新命令 `context.set`：`{ patch }`，可部分更新 `usage` / `humanLoad` / `childAccess` / `mobility` / `floor` / `loads`。
- 取值沿用既有 `ProjectContextSchema`：`humanLoad` 与 `childAccess` 为 `true` / `false` / `"unknown"`；`mobility` 为 `"static"` / `"casters"` / `"unknown"`；`floor` 为 `"wood"` / `"tile"` / `"carpet"` / `"concrete"` / `"unknown"`。本变更不扩展这些枚举。
- 空 patch 被拒绝；未知字段被 schema 拒绝。

### ADDED `editor.project-context-panel`

- 右侧检查页顶部新增「使用条件」区，可编辑移动方式、地面材质、是否承载人体、是否有儿童接触。
- 修改立即重算规则结果，产生一步可撤销历史。
- 这四项是规则的显式输入，界面上直接标明它们各自会启用哪条检查。

### CHANGED `structure.mobile-side-sway`

- 触发条件不变，但 `mobility` 现在由用户设定，示例工程默认值保持 `casters`。
- 建议动作改为在当前能力范围内可执行的项：记录侧推验证结论、在完成装配后复核。
- 不再声称模型「尚未验证节点刚度」，改为说明当前模型不含连接拓扑因此不做该判断。

### CHANGED `caster.wood-floor-soft-tread`

- 严重度由 `info` 保持不变，建议动作删除内部阶段号「P2」前缀。
- 触发条件不变，但 `mobility` 与 `floor` 现在可编辑。

### REMOVED `motion.cable-routing-safe`

- 删除该规则及其文案与本地化条目。
- 理由：由自由文本正则触发，与铝型材结构无关，内容是通用常识而非本工具的计算结果。相关注意事项移入文档。

### CHANGED `structure.long-span-review`

- 由 `warning` 降为 `info`。
- message 改为陈述事实与入口：跨度超过阈值、尚未建立选型研究、可创建研究进行挠度筛选。
- rationale 不再自我否定，改为说明阈值的性质。
- 建议动作第一项指向 `structural-sizing.study.create`（由 `gui-capability-gaps` 提供）。

### CHANGED `safety.human-load-review`

- 触发条件不变；`humanLoad` / `childAccess` 现在可编辑，该规则首次成为可达路径。
- 保留 `warning` 严重度与要求专业复核的结论，不降级。

## Not in this change

- 不新增连接件、脚轮、线缆或加工建模，因此不新增依赖这些数据的规则。
- 不改变 `dimension.*`、`structure.beam-sizing-*`、`structure.section-parameter-mismatch` 与 `caster.installed-height-required` 的语义与严重度。
- 不引入规则开关、忽略列表或规则 DSL；规则集仍是代码内的固定纯函数。
- 不改变 `blocks` 语义与 `canProceed` 的判定方式。

## Cases

- `C-context-editable-from-ui` 修改移动方式由 `static` 到 `casters` 后，侧摆与脚轮高度检查出现；改回后消失。
- `C-context-set-rejects-empty-patch` 空 patch 与未知字段被拒绝，工程不变。
- `C-context-change-undoable` 修改使用条件产生一步历史，撤销后规则结果恢复。
- `C-human-load-rule-reachable` `humanLoad` 设为 `true` 后 `safety.human-load-review` 触发，此前该路径不可达。
- `C-cable-rule-removed` 含投影仪载荷描述的工程不再产生 `motion.cable-routing-safe`。
- `C-long-span-offers-entry` 未被研究覆盖的长梁产生 `info` 级结果，并指向创建选型研究。
- `C-no-internal-phase-ids-in-copy` 全部规则文案与界面文案不含 `P0`–`P5` 内部阶段号。

## Verification

- `pnpm ready`：类型、lint、格式、边界通过；20 个测试文件 / 89 项测试通过。
- 规则测试覆盖两侧：`C-context-editable-from-ui`（`static` ↔ `casters` 开关侧摆检查）、`C-human-load-rule-reachable`、`C-cable-rule-removed`。
- 黄金样例规则集断言已更新：由 5 条减为 4 条，`motion.cable-routing-safe` 显式断言不存在。
- `pnpm test:e2e`：真实 Electron 中切换「移动方式」即时开关侧摆检查，改回后恢复。
- 自建工程验证：`context.set` 设为 `casters` + `wood` 后，`structure.mobile-side-sway` 与 `caster.wood-floor-soft-tread` 出现，证明规则输入现在由用户掌握。

## Docs impact

同步 `specs/engineering-rules.md`、`specs/editor.md`、`domain/` 规则说明与路线图当前状态。
