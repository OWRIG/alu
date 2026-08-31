# workspace-layout

> 状态：已完成。

## Why

三栏结构本身是对的，但三栏宽度写死为 `296px / 1fr / 344px`，用户不能按当前任务调整。看长参数名时左栏不够宽，看 3D 时两侧又占掉一半屏幕。

`2026-08-30-interface-language` 已经去掉了重复计数与内部值，但还有两处遗留：左栏的输入尺寸与推导结果在视觉上权重几乎相同，用户分不清哪些能改；顶栏仍有 11 个常驻元素，其中「最近工程」「另存为」「界面语言」都是低频动作，各占一个常驻位。

## 第一性原理

- 工作区的空间分配取决于当前在做什么，只有用户知道，所以必须可调。
- 能改的和算出来的必须在视觉上可区分，否则用户不知道该点哪里。
- 常驻工具栏只放高频动作；低频动作收进溢出菜单或系统菜单，不占常驻位。
- 布局状态属于本机偏好，不进 `.alu` 工程文件。

## Delta

### ADDED `editor.resizable-columns`

- 左右两栏之间新增拖拽手柄，可在 `220–460px`（左）与 `280–520px`（右）之间调整宽度。
- 双击手柄恢复默认宽度。
- 手柄可键盘操作：聚焦后左右方向键以 16px 步进调整，`Home` 恢复默认。
- 宽度保存到 `localStorage`，重启恢复；不写入 `.alu`。

### ADDED `editor.collapsible-panels`

- 左右两栏各有折叠按钮，折叠后 3D 占满剩余宽度。
- 折叠状态与宽度一起保存到本机。

### CHANGED `editor.input-vs-derived`

- 实测尺寸保留输入框与编辑按钮；推导尺寸改为只读呈现，并在行内显示推导公式（`= 2100 + 20 + 20 + 40×2`）。
- 「关键尺寸」区标注这些值由推导得出，不可直接编辑。

### CHANGED `editor.toolbar-density`

- 顶栏常驻动作收窄为：新建、打开、保存、导出、撤销、重做。
- 「最近工程」并入「打开」下拉；「另存为」与「界面语言」移入溢出菜单。

## Not in this change

- 不改 3D 视口内容与交互（由 `joints-and-machining` 处理）。
- 不改任何领域语义、命令或 `.alu` schema。
- 不引入可拖拽的面板重排、多标签或自定义工作区预设。
- 不改参数分组逻辑与术语。

## Cases

- `C-columns-resizable` 拖拽手柄改变栏宽，超出上下限时被钳制。
- `C-columns-persist` 栏宽与折叠状态重启后恢复，且不出现在 `.alu` 文件中。
- `C-columns-keyboard` 手柄可聚焦，方向键调整宽度，`Home` 恢复默认。
- `C-derived-shows-formula` 推导尺寸显示其线性公式，且没有输入框。
- `C-toolbar-density` 顶栏常驻按钮不超过六个。

## Verification

- `pnpm ready`：类型、lint、格式、边界通过；22 个测试文件 / 105 项测试通过；四路构建与 CLI skill smoke 通过。
- `pnpm test:e2e`：真实 Electron 通过，含新增的溢出菜单语言切换路径。
- `pnpm docs:screenshots`：10 张截图重生成并目检，顶栏常驻按钮为 6 个。

## 实施说明

- 栏宽由 `useLayoutStore` 驱动并写入 `localStorage`；`.workspace` 的 `grid-template-columns` 改为内联样式，原先的响应式断点覆盖会与用户设定打架，已一并移除。
- 「最近工程」并入「打开」下拉后，`data-testid="language-menu"` 消失，`scripts/capture-doc-screenshots.mjs`、`scripts/package-smoke.mjs` 与 e2e 已同步改用 `overflow-menu`。

## Docs impact

同步 `specs/editor.md`。
