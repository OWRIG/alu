# 铝 ALU

本项目只做工业铝型材结构设计与下单产物，不扩展成通用 CAD、全品类家具软件或商城。

## 开始前

按任务范围读取：

1. `docs/product-spec/roadmap.md`：当前范围、已决策与开放问题。
2. `docs/product-spec/specs/`：已实现且可观察的产品行为。
3. 对应的 `docs/product-spec/changes/`：已批准但尚在实施的行为增量。
4. `docs/engineering/architecture.md` 与对应领域文档。

## 架构边界

- `src/domain/` 必须是框架无关的 TypeScript：不得依赖 Electron、React、Three.js、Zustand 或 Node 文件系统。
- `src/shared/` 只放跨进程契约与共享 schema；不得依赖 main 或 renderer。
- `src/main/` 独占文件系统、系统对话框、工程包读写和导出。
- `src/preload/` 只暴露小而明确的桥接 API。
- `src/renderer/` 不得 import `electron` 或 `node:*`。
- Three.js 场景只是领域模型的投影；不得把 Mesh、Vector3 或材质对象写入工程文件。
- 厂商适配器只能位于 `src/main/features/catalog/adapters/<vendor>/`；中性领域模型不得出现嘉立创或其他厂商专有类型。

## 领域不变量

- 坐标：`X` 左右/横跨，`Y` 前后/移动方向，`Z` 高度；长度单位统一为 `mm`。
- 区分障碍物最外沿、结构内净空、骨架外尺寸和面板尺寸。
- 每根型材必须有稳定 ID、截面方向、切长和用途。
- 每个连接节点必须能追溯连接方式、配套紧固件和必要加工。
- 自动 BOM 是纯函数产物；人工调整以独立覆盖记录保存，不能直接污染派生结果。
- 不编造厂商 SKU、承载数据、孔位或加工能力。未确认的数据必须显式标成待确认。
- 涉及人身承载、悬空重物或儿童攀爬时，只能给出警告并要求结构复核。

## 工程文件与 AI

- `.alu` 内只允许声明式 JSON 与静态资源，禁止脚本和可执行内容。
- 所有导入数据与 IPC 入参都经 Zod 在运行时校验。
- 导入错误必须可见，不静默丢弃坏零件或未知工程内容。
- AI 只产生版本化的领域命令；命令先校验、再 dry-run、再由用户确认或策略执行。

## 变更纪律

- 改变用户可观察行为：先起草 `docs/product-spec/changes/<date>-<slug>.md`，经用户确认后实现。
- 不改变用户行为的重构或工程决策：写入 `docs/product-spec/memos/`，并说明不改变行为。
- 稳定 rule ID 和 case ID 不得复用。
- 不为假想扩展点预建插件系统、规则 DSL、数据库或后端。

## 测试纪律

- 断言结果，不用“某 mock 被调用”代替业务正确性。
- 尺寸链、BOM、迁移、导入导出和规则必须优先写纯函数测试。
- 每个已实现的产品 case 都要能映射到自动化测试或明确的人工验收步骤。
- 跨床桌黄金样例是首个端到端领域回归基线，但其中未确认的脚轮和节点参数不能用于真实下单。
