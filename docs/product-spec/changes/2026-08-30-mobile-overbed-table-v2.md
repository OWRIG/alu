# mobile-overbed-table-v2

> 状态：已交付；用户已确认本次设计更新。

## Why

旧跨床桌样例为 `2230 × 500 × 750 mm`，使用 4080 主梁与 4040 端框，既高于当前成本目标，也没有表达已选定的福马轮安装链。用户现要求桌面前后可用宽度约 `400 mm`、含脚轮完成高度约 `850 mm`、切长使用便于下单的整数，并在不牺牲主跨保障的前提下降低型材成本。

## Delta

### CHANGED `example.mobile-overbed-table-v2`

- 适配 `2100 mm` 床架外宽，左右动态余量各 `25 mm`。
- 顶框外尺寸改为 `2210 × 460 mm`；30 mm 前后主梁形成 `400 mm` 槽内深度。
- 平嵌板名义尺寸改为 `2146 × 396 × 18 mm`，仍要求组框校方后再实测下单。
- 切料改为：`TXCK-H6-J3090 2210 mm × 2`、`TXCK-H6-J3030 400 mm × 2`、`TXCK-H6-J3030 620 mm × 4`、`TXCK-H6-J3060 600 mm × 2`；3060 底座平放，保留 600 mm 防倾覆支承深度。
- 竖向概念链为 `113 + 30 + 620 + 90 = 853 mm`。其中 `GD-80-S-HUP` 厂家公布脚轮高度为 `103 mm`，连接板安装叠高暂按 `10 mm` 建模；下料前必须以脚轮和 `TPED-308-3060-M12` 实物总成复测。

### CHANGED `structure.beam-sizing-study`

- 允许 90 mm 主梁高度，并把接口体系切换到 JLCFA 欧标 30 槽 8。
- 加入 JLCFA `J3030`、`J3060`、轻型 `J3090` 与标准 `3090` 的厂家数据；保留原候选作为跨体系对照，不允许静默跨体系入选。
- 默认概念工况改为 `12 kg` 板重、`15 kg` 均布使用载荷与最不利单梁 `10 kg` 跨中集中载荷。
- 在 `2180 mm` 有效跨度和 `L/1000` 准则下，轻型 `TXCK-H6-J3090` 应为当前兼容候选中的最小质量通过项。

## Not in this change

- 不把本概念工况解释为整机额定承载；禁止坐人、倚靠、儿童攀爬。
- 不声称已验证节点刚度、侧摆、倾覆、脚轮动态冲击或板材托承。
- ALU P1 仍不生成连接件、紧固件、脚轮、加工与板材的完整采购 BOM。
- 不改写历史发布说明和 v1 兼容 fixture。

## Cases

- `C-inset-tabletop-fit`：派生 `2210 × 460 mm` 顶框、`400 mm` 槽内深度与 `2146 × 396 × 18 mm` 名义板。
- `C-inset-top-frame-topology`：主梁、端梁、立柱与平放 3060 底座的截面、位置和整数切长一致。
- `C-beam-superposition`：J3090 分项挠度可复算，总挠度约 `1.147 mm`，限值 `2.18 mm`。
- `C-minimum-mass-passing-profile`：`TXCK-H6-J3090` 为当前接口、高度与工况内最小质量通过项。
- `C-caster-height-in-vertical-chain`：更改脚轮安装总高时顶面保持不变，底座和立柱起点同步移动，立柱切长重算。
- `C-sizing-apply-to-model-and-bom`：应用选型后两根主梁与切料真值写入 JLCFA 精确 SKU。
- `C-not-for-ordering`：允许导出 `order-draft`，但在连接、脚轮实测、板材托承和完整订单数据补齐前阻断 `order-ready`。

## Verification

- `pnpm test:run`：20 个测试文件、78 个测试通过。
- typecheck、lint、boundary check 通过；本次变更文件的 format check 通过。
- `pnpm build`、CLI smoke、Electron P1 E2E 与双语文档截图重建通过。
- 新 `.alu` 的 `order-draft` 校验与 Markdown/JSON 导出通过；`order-ready` 按设计被 `project.order-data-incomplete` 阻断。
- 新工程、交接报告、切料导出、十张界面截图与效果图完成人工核对。

## Docs impact

同步 README 五分钟示例、双语参数化框架示例、跨床桌领域样例、结构计算说明、当前 editor spec 与设计目录视觉说明。
