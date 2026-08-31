# manufacturing-friendly-dimensions

> 状态：已交付；用户已确认本次尺寸适配。

## Why

上一版 `2210 mm` 主梁和 `620 mm` 立柱虽然满足几何链，但没有利用用户允许的宽度与高度容差。用户希望在不牺牲真实净空、人体工学和主跨保障的前提下，优先采用更容易沟通、测量和下料的整十整百尺寸。

## Delta

### CHANGED `example.manufacturing-friendly-frame`

- 2100 mm 障碍外宽的左右动态余量由 25 mm 改为 20 mm，使顶框外宽和主梁切长由 2210 mm 收敛为 2200 mm。
- 立柱切长由 620 mm 改为 600 mm；脚轮 113 mm、平放底座 30 mm 和主梁 90 mm 不变，完成面由 853 mm 改为 833 mm，仍在 850 ± 30 mm 目标内。
- 顶框外深保持 460 mm、端梁保持 400 mm、底座保持 600 mm，不为整尺缩短防倾覆支承。
- 平嵌口袋改为 2140 × 400 mm；名义单边缝由 2 mm 放宽至 5 mm，板材报价占位改为 2130 × 390 × 18 mm，并继续要求组框校方后实测。

### CHANGED `structure.beam-sizing-study`

- 有效跨度由 2180 mm 改为 2170 mm，挠度限值由 2.18 mm 改为 2.17 mm。
- 轻型 `TXCK-H6-J3090` 的计算挠度约为 1.131 mm，两根切料质量约 8.67 kg，仍是当前接口和高度约束中的最低质量通过项。

## Not in this change

- 不把“整尺”设为高于现场净空、人体工学、防倾覆或连接可行性的硬约束。
- 不修改脚轮、转接板或型材 SKU。
- 不生成正式效果图、工程交付单、采购 BOM 或下单文件；当前只创建评审 `.alu`。

## Cases

- `C-manufacturing-friendly-width`：2100 + 20 + 20 + 30 + 30 = 2200 mm。
- `C-manufacturing-friendly-height`：113 + 30 + 600 + 90 = 833 mm，位于 850 ± 30 mm 内。
- `C-panel-allowance-balanced`：2140 × 400 mm 口袋对应 2130 × 390 mm 名义板，最终尺寸仍依赖实测。
- `C-beam-superposition`：2170 mm 有效跨度下重新计算全部候选，J3090 保持入选。
- `C-no-formal-release`：设计变更只更新工程与评审材料，不触发正式输出。

## Verification

- 默认尺寸链与梁复算按 RED → GREEN 的领域测试覆盖；RED 捕获旧的 2210 / 620 / 2180 假设，GREEN 后全量 89 项单元测试通过。
- `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm boundaries`、`pnpm build`、CLI smoke 与 Electron E2E 均通过。
- 10 张双语文档截图已重建并抽查编辑器、下料和候选对比视图。
- 新评审 `.alu` 的 `order-draft` 校验通过；`order-ready` 继续按设计由 `project.order-data-incomplete` 阻断。

## Docs impact

同步双语 README、参数化示例、跨床桌领域说明、结构计算、editor spec、测试策略、界面截图与本地评审说明。
