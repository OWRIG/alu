# 实施计划

> 进度：P0/P1 与 macOS arm64 prerelease 切片已于 2026-08-09 完成；P2–P4 的产品能力仍未开始，Apple 公证与跨平台分发仍属后续。

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
- Windows 正式签名主体与发布渠道；Apple 公证凭据的持续托管方式。

这些缺口不阻止 P0/P1；它们阻止的是“直接拿软件结果下单”和正式公开分发。

## P0：工程基线（已完成）

产物：

- Electron + electron-vite + React + 普通 CSS 空壳。
- main/preload/renderer/domain/shared 目录和 TypeScript project references。
- 安全 BrowserWindow、窄 preload API、日志和隔离 dev userData。
- Zod `ProjectDocumentV1` / Command 的第一版 schema；v1 只包含 context、参数、绑定、型材与型材 definition snapshot。
- oxlint、oxfmt、Vitest、Playwright、boundaries 与 ready 命令。

验收：应用能启动；边界测试证明 renderer 无 Node；`pnpm ready` 通过。

## P1：第一条纵向切片（已完成）

产物：

- 领域核心先行：ProjectDocument v1（含 context、参数、绑定、型材）、canonical JSON 与量化、designHash/fileHash/bomHash、结构共享 `applyCommand` + 100 步撤销。
- 输入/派生参数（线性组合）求值、环检测、绑定同步。
- 新增、选择、删除矩形型材；长度与位置通过属性面板编辑，可绑定参数。
- 型材切割 BOM。
- `.alu` v1 单 JSON 原子保存、打开、最近工程。
- 三栏编辑器骨架：参数/属性面板、只读 3D 投影（点击选中）、BOM 面板；拖拽、吸附、gizmo 移至 P2。
- 跨床桌 golden fixture 以纯函数测试全绿（尺寸链求值 + 规则触发）。

验收：`C-param-input-edit` 到 `C-bom-recompute-stable` 的相关 case 自动化通过；修改床宽等输入参数后骨架尺寸与 BOM 一致更新；保存重开 E2E 通过。

## P2：节点、加工与完整 BOM（6–10 人日）

产物：

- 拖拽、吸附与 gizmo 交互（先产生候选命令，规则通过后提交）。
- 型材端点和吸附。
- 型材局部 `s/u/v` 坐标、稳定 interface ID，以及从 v1 到节点 schema 的纯函数迁移。
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

## P4：Agent 接口层（5–8 人日）

产物：

- 命令协议收尾：dry-run 变更摘要、结构化错误与批量事务全量落地；`commandId` 只做关联，重试通过 expected revision + 重新读取 designHash 收敛。
- Zod → JSON Schema 构建产物。
- `alu` CLI（headless）：校验、参数求值、dry-run/apply 批量命令、导出 BOM/规则、目录搜索；输出 JSON、退出码稳定；基于纯 domain 与 Electron 无关的文件模块。
- 配套 Agent Skill：SKILL.md 教 agent 用 CLI 驱动工程（读 → dry-run → apply、参数优先、错误码与规则结论解读）；skill 示例命令进入冒烟测试，与 JSON Schema 产物同源。
- 应用内外部修改检测：磁盘 `.alu` 被外部改动时提示重载。
- 内置参数化模板：矩形框、桌、层架、移动跨床桌起始向导。
- 规则解释与修复建议，但不自动绕过硬错误；粘贴命令 JSON 保留为调试兜底。

验收：同一初始 designHash 和命令批经 UI 与 CLI 执行得到相同最终 designHash；整批失败不留半份修改；外部 agent 借助 skill 用 CLI 完成"改床宽 → 读回 BOM 与警告"闭环。

当前仓库已提前提供一个不依赖 CLI 的 `design-with-alu` 桌面工作流 Skill，便于 agent 正确操作现有 UI 并遵守产品边界；它不表示上述 P4 接口已经实现。

## P5：分发（macOS arm64 prerelease 切片已完成）

产物：

- 已实现：electron-builder macOS arm64 配置、内容过滤、fuses、ASAR/locale/体积回归、打包应用 E2E 入口。
- 已验证：Developer ID 签名、DMG/ZIP checksum、fuses/ASAR/生产 CSP、安装包 smoke；Gatekeeper 如实标记为未公证。
- 后续：Apple 公证自动化、Windows/x64/universal、自动更新和 CI 发布回归。

## 总量判断

- **可演示纵向切片**：约 5–8 人日。
- **能做真实小项目的 alpha**：约 15–23 人日。
- **含 Agent 接口和双平台分发**：约 23–37 人日。

估算不含大量手工录入供应商目录。目录采集、校验和版权确认可能成为独立工作流。

## 第一批具体任务（全部完成）

1. 初始化 Electron 工程与版本锁。
2. 建只覆盖 P1 的 `ProjectDocumentV1Schema`（context/参数/绑定/型材/型材 definition snapshot）、canonical JSON、三种哈希与 0.01 mm 量化。
3. 建参数求值纯函数：线性组合、拓扑排序、环检测。
4. 建 `SetParametersCommand`（含绑定同步）与 `AddProfileCommand` / `UpdateProfileCommand` / `RemoveEntityCommand`。
5. 建结构共享纯函数 `applyCommand` 和 history。
6. 建 `deriveProfileBom`（稳定排序 + bomHash）。
7. 建尺寸链与 advisory 规则首批（黄金样例所需）。
8. 建 `.alu` v1 JSON 原子读写、安全窗口和窄 preload project API。
9. 建 Three.js viewport 的只读 profile projection，接参数/属性编辑和 BOM 面板。
10. 把跨床桌 fixture 接进 Vitest 与保存重开 E2E。

不先做图标、官网、登录、云同步、全量供应商目录或漂亮的真实 T 槽网格。
