# gui-capability-gaps

> 状态：已完成。

## Why

桌面编辑器缺三处能力，导致产品终点在 GUI 里不可达：

1. **型材规格不可更换。** `addProfile` 硬编码 `GENERIC_PROFILE_DEFINITIONS[2]`（4040），`UpdateProfilePatchSchema` 不含 `definitionRef`，构件属性里「型材规格」是只读值。代码里的 2020 / 3030 / 4080 概念包络在 GUI 中不可达。唯一能更换规格的路径是 `structural-sizing.selection.apply`。
2. **GUI 无导出。** CLI 有 `export`（JSON / Markdown / PDF），`domain/report/handoff.ts` 与 `main/features/report/render-pdf.ts` 均已就绪，但没有对应 IPC 通道。桌面用户走完全流程后拿不出任何交付物。
3. **选型研究不可创建。** 命令表有 `structural-sizing.loads.set` 与 `structural-sizing.selection.apply`，没有创建命令。研究只存在于内置示例的 `.alu` 中，用户自建工程的「选型」页恒为空态。

三者叠加的结果：用户自建的工程，每根型材永远是概念 4040 包络，永远无法筛选具体 SKU，也永远无法导出。料单不可下单不是披露问题，是能力缺失。

## 第一性原理

- 产品的终点产物是一张可复核、可带走的料单；GUI 必须能到达终点，而不是只在屏幕上显示中间态。
- 「选择型材」是铝型材设计工具的最小核心动作，不能只作为选型结果的副产品存在。
- 命令只接受用户必须决定的输入；标准候选目录、重力加速度、弹性模量、挠度准则等由共享目录提供默认值，不要求用户逐项填写。
- 更换规格必须同时更新 `definitionRef` 与内嵌快照，并回收不再被引用的 definition；不允许出现悬空引用或未锁定的 SKU。
- GUI 与 headless CLI 复用同一套领域命令与同一份交付单构建器，不建立第二条产物生成路径。

## Delta

### ADDED `command.profile.set-definition`

- 新命令 `profile.set-definition`：`{ entityId, definitionSnapshot }`。
- 校验 `definitionHash` 与 definition 内容一致；与工程内同键快照冲突时报 `catalog.definition-conflict`。
- 替换目标型材的 `definitionRef`，写入内嵌快照，并回收不再被任何型材引用的 definition。
- 与 `profile.add` 使用相同的快照校验语义，不新增第二套锁定机制。

### ADDED `editor.profile-definition-picker`

- 构件属性里「型材规格」由只读值改为下拉选择。
- 候选来源：内置通用概念包络（2020 / 3030 / 4040 / 4080）加上当前工程内嵌的全部 definition（含选型应用后的具体 SKU）。
- 选项显示规格名与截面尺寸；已被选型研究应用过的 SKU 标注厂家。
- 更换规格立即更新 3D 投影、切料 definition 与料单，产生一步可撤销历史。

### ADDED `command.structural-sizing.study.create`

- 新命令 `structural-sizing.study.create`：`{ beamEntityIds, effectiveSpanParam, maximumSectionHeightParam, requiredCompatibilityGroup }`。
- 其余字段由共享目录提供：标准候选集、重力加速度、弹性模量、`L/1000` 挠度准则、载荷分配系数、假设 ID、计算来源与构造证据。
- 载荷输入初始为 0，由已有的「设计载荷」界面继续编辑。
- `beamCount` 取 `beamEntityIds` 长度；工程已存在研究时报 `structure.sizing-study-exists`。
- 引用的型材与参数必须存在，否则报 `ref.entity-missing` / `ref.parameter-missing`。

### CHANGED `editor.sizing-panel`

- 空态由「描述缺什么」改为可执行入口：选择主梁、有效跨度参数、截面高度上限参数与接口体系后创建研究。
- 创建后进入既有的载荷编辑与候选对比流程，不改变已有计算语义。

### ADDED `editor.project-export`

- 新 IPC 通道 `alu:project:export`，复用 `buildProjectHandoff` 与既有渲染器。
- 工具栏新增「导出」，支持 Markdown 交接单、JSON 交付单与 PDF 三种格式。
- 导出前弹出系统保存对话框；导出文件不得覆盖源 `.alu`，冲突时报 `report.output-conflicts-project`。
- 桌面导出使用 `order-draft` 校验目标（CLI 的 `--target` 默认为 `edit`）。该目标只影响交付单的 `validation` 段；`reportVersion`、`bomHash`、参数、材料、选型与检查结果与 CLI 输出逐字一致。

### CHANGED `editor.parameter-groups`

- 左栏参数分组由硬编码 ID 列表改为按 `boundaryKind` 分组，删除 `inputGroupDefinitions` 常量。
- 分组顺序固定为：障碍外沿 → 动态余量 → 结构内净 → 骨架外包 → 桌板 → 高度 → 结构。
- 空白工程与内置示例使用同一套分组逻辑，`boundaryKind` 由纯展示字段变为影响结构的字段。

## Not in this change

- 不做连接节点、紧固件、加工、板材与脚轮建模，料单仍只覆盖型材切料。
- 不引入自定义型材目录、目录搜索或厂商适配器；候选集仍是内置的具体 SKU 快照。
- 不改动挠度筛选的计算语义、候选过滤顺序或最小质量目标函数。
- 不新增自动下单、价格、库存或网络请求。
- 不重写术语与界面文案，不调整三栏布局（另行处理）。

## Cases

- `C-definition-picker-blank-project` 空白工程添加型材后可切换到 2020 / 3030 / 4080，3D、切料 definition 与料单同步更新。
- `C-definition-snapshot-integrity` 更换规格后工程内嵌快照包含新 definition，且不再被引用的旧 definition 被回收。
- `C-definition-change-undoable` 更换规格产生一步历史，撤销后恢复原 definitionRef 与快照。
- `C-study-create-blank-project` 空白工程建立主梁后可创建选型研究，随即可编辑载荷并得到候选对比。
- `C-study-create-rejects-duplicate` 已有研究的工程再次创建时报 `structure.sizing-study-exists`，工程不变。
- `C-study-create-validates-refs` 引用不存在的型材或参数时命令被拒绝，工程不变。
- `C-export-parity-with-cli` GUI 导出的 Markdown / JSON 与 CLI `export` 对同一工程产出一致的 `reportVersion` 与 `bomHash`。
- `C-export-refuses-overwriting-project` 导出目标为源 `.alu` 时被拒绝，源文件不变。
- `C-parameter-groups-from-boundary-kind` 空白工程新建参数后按 `boundaryKind` 落入对应分组，不再全部归入「其他输入」。

## Verification

- `pnpm ready`：类型、lint、格式、边界通过；20 个测试文件 / 89 项测试通过；主进程、preload、renderer 与 CLI 构建通过；CLI skill smoke 通过。
- 新增领域测试：`C-definition-picker-blank-project`、`C-definition-snapshot-integrity`（含快照回收与 hash 不匹配拒绝）、`C-study-create-blank-project`、`C-study-create-rejects-duplicate`、`C-study-create-validates-refs`。
- 新增 `C-export-parity-with-cli`：`order-draft` 与 `edit` 两个目标除 `validation` 段外逐字相同，`bomHash` 与 `reportVersion` 一致。
- `pnpm test:e2e`：真实 Electron 中验证规格下拉切换后料单显示 `Concept 2020 Envelope`、导出 Markdown 落盘且包含 `TXCK-H6-J3090`；preload 暴露面新增 `export`。
- 端到端手工验证：`alu create --template blank` 后依次 `profile.add` ×2 → `profile.set-definition` → `structural-sizing.study.create` → `context.set` → `loads.set` → `selection.apply` → `export`，全部成功，交付单含 2 条材料行与真实厂家 SKU。

## Docs impact

同步 `specs/editor.md`、`specs/profile-bom.md`、`specs/headless-cli.md`、`engineering/architecture.md` 与路线图当前状态。
