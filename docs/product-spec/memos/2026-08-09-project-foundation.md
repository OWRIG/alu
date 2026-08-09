# ALU 项目地基决策

- 日期：2026-08-09
- 性质：工程与产品方向 memo，不代表已实现行为

## 决策

1. 产品中文名为“铝”，英文/代码名为 `ALU`，目录 `alu`，工程文件 `.alu`。
2. 聚焦工业铝型材结构，不做通用 CAD。
3. Electron + electron-vite + React + Three.js + Zustand + Zod；P1 使用普通 CSS，不保留未使用的 Tailwind 构建插件。
4. 单包三进程，核心 domain 框架无关。
5. Three.js 是视图，ProjectDocument 是真相。
6. BOM 分 derived/manual/adjustment 三层。
7. `.alu` 内嵌所有已引用 definition 快照，保证工程可流通。
8. AI、模板和 UI 共用版本化领域命令。
9. 先做纵向闭环，再扩连接件、目录和 AI；不预建插件系统或后端。

## 依据

- Keel 研究证明 electron-vite、Tailwind 4、严格三进程和 Electron E2E 的工程可行性；详见 `docs/research/keel-findings.md`。
- 既有嘉立创页面自动化没有稳定得到可见、完整且带连接件的模型，说明产品核心不能依赖某个网页设计器。
- 铝型材下单失败通常来自连接、加工、占槽和装配信息缺失，而不是缺一张漂亮 3D 图，因此领域模型和 BOM 必须先于视觉精细度。

## 被否决方向

- Tauri：体积有优势，但本项目更重视 macOS/Windows 统一 Chromium 行为和 Three.js 调试一致性。
- 直接基于 MayCAD/FreeCAD 插件：平台或交互边界与中文 AI 友好目标不一致。
- Electron monorepo + oRPC +插件框架一步到位：对 P0 没有足够收益。
- 自定义 BOM 运行任意脚本：安全、兼容和可移植成本过高。

## 复议触发条件

- 单包出现第二个独立可发布应用时复议 monorepo。
- IPC 方法和流式事件多到显式契约重复成为主要维护成本时复议 RPC。
- ProjectDocument 超过快照撤销的内存预算时复议 patch history。
- 至少两个真实第三方扩展需要同一生命周期时复议插件框架。
