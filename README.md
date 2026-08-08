# 铝 ALU

专注工业铝型材结构的中文桌面设计工具：从空间约束和参数化骨架出发，生成可复核的型材切割表、加工表、连接件与紧固件 BOM，并支持完整工程导入导出。

> 当前阶段：项目方案基线。尚未开始实现产品代码。

## 名称

- 中文名：**铝**
- 英文名：**ALU**
- 定位副标题：**铝型材设计与下单工作台**
- 工程目录：`alu`
- 工程文件扩展名：`.alu`

名字只保留一个字：**铝**。它不把产品限制成某一种家具或某一家供应商，也不会让用户误以为这是通用 CAD。英文界面、代码名和包名统一使用 `ALU` / `alu`。该名称非常通用，正式公开发布前仍需做商标、域名与应用商店检索。

## 产品承诺

1. 3D 画面不是唯一真相；尺寸、节点、加工和物料都有明确的结构化数据。
2. BOM 不只列型材长度，还包含连接件、螺栓螺母、加工、脚轮、板材和装配注意事项。
3. 自定义零件和目录可以随工程一起流通，别人导入后不会丢定义。
4. AI 只能提交经过校验、可预览、可撤销的建模命令，不能直接操作 Three.js 场景。
5. 经验规则会标明适用范围、证据和置信度；软件不冒充结构认证或厂家额定载荷。

## 技术基线

- Electron + electron-vite
- React + TypeScript
- Three.js + React Three Fiber（仅作为视图适配层）
- Zustand
- Zod
- Tailwind CSS 4
- Vitest + Playwright Electron
- electron-builder（进入可分发阶段后接入）

包管理器暂定 `pnpm`。项目保持单包结构，不照搬大型 monorepo。

## 文档入口

- [产品行为与变更协议](docs/product-spec/README.md)
- [路线图与决策索引](docs/product-spec/roadmap.md)
- [MVP 行为契约草案](docs/product-spec/changes/2026-08-09-bootstrap-mvp.md)
- [总体架构](docs/engineering/architecture.md)
- [领域模型与工程文件格式](docs/engineering/domain-model.md)
- [测试与质量门禁](docs/engineering/testing-strategy.md)
- [实施计划](docs/engineering/implementation-plan.md)
- [铝型材工程规则目录](docs/domain/engineering-rule-catalog.md)
- [Keel 研究结论](docs/research/keel-findings.md)
- [领域资料来源与边界](docs/research/domain-sources.md)
- [跨床桌黄金样例](test/fixtures/mobile-overbed-table-v1/README.md)

## 第一条可用闭环

首个纵向切片只做一件完整的事：

> 新建工程 → 放置并编辑矩形型材 → 保存 `.alu` → 重新打开 → 自动得到一致的型材切割 BOM。

连接件、加工、自定义目录和 AI 指令随后逐层接入，但底层数据格式从第一天就为它们留出稳定位置。
