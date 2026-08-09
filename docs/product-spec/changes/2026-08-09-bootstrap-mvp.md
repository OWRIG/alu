# bootstrap-mvp

> 状态：已实现，已验证。

## Why

建立一个最小但完整的铝型材设计闭环，验证领域模型、参数尺寸链、3D 投影、工程文件和 BOM 可以使用同一份结构化数据工作。明确不在本单实现完整连接件目录、AI 对话、云服务或供应商下单。

本 changeset 只对应路线图 P1。P2 节点与完整 BOM、P3 自定义目录与流通、P4 Agent 接口分别使用独立 changeset，不能以“协议先占位”为由提前写入本单验收范围。

## Not in this change

- 连接节点、加工、板材、脚轮和订单级完整 BOM。
- 自定义目录、人工 BOM 行、derived 调整和导入冲突处理。
- headless CLI、Agent Skill、外部文件重载和参数化模板。

## Delta

### ADDED `editor.dimension-parameters`

工程文档可以表达输入参数（床宽、余量、高度等空间约束）与线性组合派生参数，并把型材字段绑定到参数。P1 界面编辑工程内已有输入值；参数定义与派生公式编辑器不在本单。尺寸链是一等数据，不是模板私有逻辑。

- `C-param-input-edit` 修改输入参数后，所有派生参数按线性公式重新求值。
- `C-param-derived-chain` 跨床桌尺寸链（内净宽、骨架外宽、桌板宽、桌板下表面离床垫）由派生参数一次算出，与黄金样例一致。
- `C-param-cycle-error` [error] 参数依赖成环被拒绝，错误指出环路。
- `C-param-binding-sync` 绑定到参数的型材字段随参数修改一致更新，且整个更新是一步撤销。
- `C-param-manual-override-stale` [boundary] 手工修改被绑定字段不被禁止，但绑定标为失同步并可见；用户可重同步或解除绑定。

### ADDED `editor.profile-modeling`

用户可以在毫米坐标系中新增、选择、移动和修改矩形工业铝型材。每根型材拥有稳定 ID、规格引用、起点、方向、切长和截面朝向。

- `C-add-profile` 新增型材后，3D 画布和属性面板显示同一根构件。
- `C-edit-profile-length` 修改切长后，几何尺寸和 BOM 同步更新。
- `C-invalid-profile-length` [error] 零值、负值或非有限长度被拒绝并说明原因。
- `C-profile-axis-orientation` [boundary] X/Y/Z 三个主轴与截面朝向可区分，不因相机角度改变。

### ADDED `editor.history`

所有会改变工程的领域命令都进入统一历史；视角、面板开合等 UI 状态不进入工程历史。

- `C-undo-redo-model-command` 新增或修改型材后可以撤销和重做，结果及 BOM 一致。
- `C-history-clears-redo-branch` [boundary] 撤销后执行新命令，旧重做分支被清除。

### ADDED `project.portable-package`

工程保存为 `.alu` 版本化单一 JSON 文档（v1），内含工程数据、参数、所引用零件定义快照和可选 BOM 快照；不包含脚本或可执行内容。预览图是本机派生缓存，不进入工程文件。

- `C-save-reopen-roundtrip` 保存后重新打开，稳定 ID、尺寸、参数和已引用型材 definition 无损。
- `C-embedded-catalog-portability` 工程只使用内嵌的已引用零件定义即可在另一台机器打开。
- `C-import-schema-validation` [error] 非法 schema、超限或损坏文件被拒绝并给出可定位错误。
- `C-import-unknown-version` [error] 高于当前支持版本的工程不被静默降级。
- `C-atomic-save` [boundary] 保存中断不会覆盖最后一次成功文件。

### ADDED `bom.deterministic-generation`

自动 BOM 是从型材实体和已锁定型材 definition 计算出的纯函数结果。P1 只生成型材规格、切长、截面朝向、数量和用途。

- `C-profile-bom-aggregation` 同 definition revision、同切长、同截面朝向和同用途的型材合并数量；任一条件不同则分行。
- `C-bom-source-trace` 每行可追溯到来源实体 ID。
- `C-bom-recompute-stable` 同一 designHash 重复计算得到稳定排序和相同 bomHash。
- `C-bom-snapshot-drift` [boundary] 导入包内 BOM 快照与当前重算不一致时，显示“已重新计算”而不是继续使用旧快照。

### ADDED `rules.explainable-validation`

工程检查输出带稳定 rule ID、严重级别、涉及实体、解释、来源类型和适用范围。硬错误阻止不合法产物；经验警告允许继续但不得伪装成认证。

- `C-rule-hard-error` 负长度、缺失型材 definition、参数成环等模型错误阻止提交或导出。
- `C-rule-advisory-warning` 大跨度、移动结构侧摆、脚轮地板保护等经验规则给出警告和检查建议。
- `C-rule-no-fake-rating` [boundary] 没有厂家数据或结构计算时，不显示确定承载值或“安全”结论。

## Verification

Tested build: `pnpm ready`（类型、lint、格式、边界、产品规格、31 项 Vitest、生产构建）与 `pnpm test:e2e`（macOS Electron 40，真实编辑/撤销/重做/保存/重启重开闭环）。

| Case                                                                                               | 结果 | 方法与证据                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `C-param-input-edit`、`C-param-derived-chain`、`C-param-cycle-error`                               | 通过 | `src/domain/params/evaluate.test.ts`；E2E 将床宽 2100 改为 2200，骨架外宽从 2230 更新到 2330 mm               |
| `C-param-binding-sync`、`C-param-manual-override-stale`                                            | 通过 | `src/domain/commands/apply.test.ts` + `src/domain/rules/evaluate.test.ts`；同步、保留手工覆盖、重同步均有断言 |
| `C-add-profile`、`C-edit-profile-length`、`C-invalid-profile-length`、`C-profile-axis-orientation` | 通过 | 领域命令测试覆盖新增/朝向/非法长度；Electron E2E 覆盖界面新增与属性投影                                       |
| `C-undo-redo-model-command`、`C-history-clears-redo-branch`                                        | 通过 | `src/domain/commands/history.test.ts`；E2E 覆盖参数命令撤销/重做                                              |
| `C-save-reopen-roundtrip`、`C-embedded-catalog-portability`                                        | 通过 | `src/main/features/project/project-file.test.ts`；E2E 保存 `.alu`、关闭应用、以该文件启动并读回 2330 mm       |
| `C-import-schema-validation`、`C-import-unknown-version`                                           | 通过 | `src/domain/project/parse.test.ts` 覆盖严格字段、版本、definition hash 和语义引用                             |
| `C-atomic-save`、`C-bom-snapshot-drift`                                                            | 通过 | project-file 测试覆盖成功替换、失败保留原字节、快照漂移；UI 显示重算提示                                      |
| `C-profile-bom-aggregation`、`C-bom-source-trace`、`C-bom-recompute-stable`                        | 通过 | `src/domain/bom/derive.test.ts` + E2E BOM 面板断言                                                            |
| `C-rule-hard-error`、`C-rule-advisory-warning`、`C-rule-no-fake-rating`                            | 通过 | schema/命令硬错误测试与 `src/domain/rules/evaluate.test.ts` 的稳定规则集合、禁用虚假承载文案断言              |

## Docs impact

已同步 `specs/editor.md`、`specs/project-file.md`、`specs/profile-bom.md`、`specs/engineering-rules.md` 与 alpha README。
