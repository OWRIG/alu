# 实施计划

## 前置条件

### 已具备

- macOS 开发环境与本地 Chromium/Electron 经验。
- `keel` 提供了 electron-vite、Tailwind 4、三进程边界、Vitest/Playwright 和 electron-builder 的可运行参考。
- 已有跨床桌真实需求，适合作为第一个 golden fixture。
- 已沉淀豪佳铝业教程中的选型、连接、面板、脚轮和装配经验。

### 尚缺

- 可合法分发的型材截面、连接件、紧固件和加工能力目录。
- 第一家供应商数据的稳定导入方式与许可边界。
- 跨床桌脚轮安装总高、最终节点方式和真实试载数据。
- macOS/Windows 正式签名主体与发布渠道。

这些缺口不阻止 P0/P1；它们阻止的是“直接拿软件结果下单”和正式公开分发。

## P0：工程基线（1–2 人日）

产物：

- Electron + electron-vite + React + Tailwind 4 空壳。
- main/preload/renderer/domain/shared 目录和 TypeScript project references。
- 安全 BrowserWindow、窄 preload API、日志和隔离 dev userData。
- Zod ProjectDocument/Command 的第一版 schema。
- oxlint、oxfmt、Vitest、Playwright、boundaries 与 ready 命令。

验收：应用能启动；边界测试证明 renderer 无 Node；`pnpm ready` 通过。

## P1：第一条纵向切片（4–6 人日）

产物：

- 新建工程与三栏编辑器骨架：零件/画布、3D viewport、属性/BOM。
- 新增、选择、移动、改长、删除矩形型材。
- 命令提交和 100 步撤销/重做。
- 型材切割 BOM。
- `.alu` 原子保存、打开、最近工程。
- 跨床桌尺寸链 golden fixture。

验收：`C-add-profile` 到 `C-bom-recompute-stable` 的相关 case 自动化通过；保存重开 E2E 通过。

## P2：节点、加工与完整 BOM（6–9 人日）

产物：

- 型材端点和吸附。
- 连接节点、角码/端面螺栓等中性 definition。
- 配套紧固件、端盖、槽螺母、加工项派生。
- 板材、脚轮占位实体和接口规则。
- 规则面板：硬错误、警告、来源与实体定位。
- 切割表、加工表、配件表三个视图。

验收：一个小桌和跨床桌样例都能生成不缺连接件的订单级草稿；未确认项被明确标出。

## P3：自定义目录与工程流通（4–6 人日）

产物：

- 自定义 part definition 创建、编辑、错误列表。
- 工程只嵌入实际引用 definition。
- 导入冲突选择与 revision lock。
- final BOM 的 CSV/JSON 导出。
- manual lines、adjustments 和 orphan warning。

验收：在隔离 E2E profile 中导出工程，再导入到空目录，模型和 BOM 一致。

## P4：AI 友好层（5–8 人日）

产物：

- 版本化命令协议、dry-run、变更摘要和批量命令事务。
- 内置参数化模板：矩形框、桌、层架、移动跨床桌起始向导。
- AI 适配端口；先允许用户粘贴/导入命令 JSON，再接具体模型 API。
- 规则解释与修复建议，但不自动绕过硬错误。

验收：同一命令由测试、UI 和 AI 入口执行得到相同工程哈希；整批失败时不留下半份修改。

## P5：分发（3–5 人日，不含证书等待）

产物：

- electron-builder macOS/Windows 配置。
- 构建内容过滤和 bundle size 回归。
- 签名、公证、安装包 smoke、升级策略。
- 发布回归清单。

## 总量判断

- **可演示纵向切片**：约 5–8 人日。
- **能做真实小项目的 alpha**：约 15–23 人日。
- **含 AI 命令和双平台分发**：约 23–36 人日。

估算不含大量手工录入供应商目录。目录采集、校验和版权确认可能成为独立工作流。

## 第一批具体任务

1. 初始化 Electron 工程与版本锁。
2. 建 `ProjectDocumentV1Schema` 和 canonical JSON。
3. 建 `AddProfileCommand` / `UpdateProfileCommand` / `RemoveEntityCommand`。
4. 建纯函数 `applyCommand` 和 history。
5. 建 `deriveProfileBom`。
6. 建 `.alu` manifest、打包与安全读取。
7. 建安全窗口和窄 preload project API。
8. 建 Three.js viewport 的 profile projection。
9. 接属性编辑和 BOM 面板。
10. 把跨床桌 fixture 接进 Vitest 与保存重开 E2E。

不先做图标、官网、登录、云同步、全量供应商目录或漂亮的真实 T 槽网格。
