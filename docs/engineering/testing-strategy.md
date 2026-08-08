# 测试与质量门禁

## 原则

1. 断言产物，不用 mock 调用次数替代业务正确性。
2. 领域纯函数测试最多、Main 文件边界测试其次、Renderer 交互测试适量、Electron E2E 保持少而关键。
3. 每个产品 case 要绑定自动化或明确的人工证据。
4. 坏工程、坏目录和不完整 BOM 必须可见，不能以“加载为空”通过测试。

## 分层

### L0 Schema 与规范化

- Zod 接受合法 v1、拒绝未知顶层字段和非有限数值。
- canonical JSON/hash 对对象键顺序不敏感。
- format migration fixture 可重复、幂等且不丢扩展字段。
- 命令 schema 拒绝旧 revision、非法 ID 和越界数量。

### L1 领域规则

- X/Y/Z 尺寸链与截面朝向。
- 型材长度、节点引用、接口兼容和占槽冲突。
- BOM 聚合键、配套紧固件、加工项和来源追溯。
- manual/adjustment/orphan 行为。
- 经验警告与硬错误的级别不会互换。
- 没有证据时不生成确定承载值。

### L2 文件与 IPC

- `.alu` 保存、重开和再保存 round-trip。
- 同目录临时文件 + rename；模拟失败时原文件不变。
- ZIP slip、绝对路径、重复条目、符号链接、超限文件和压缩炸弹拒绝。
- 内嵌目录冲突不覆盖个人目录。
- 每个 IPC channel 的入参和输出都走 schema。
- Renderer 无法获得任意文件系统或 shell 能力。

### L3 Renderer

- Zustand command 提交、撤销、重做和 redo 分支清理。
- 属性面板修改后，工程 snapshot、画布投影和 BOM 面板一致。
- 规则错误定位到对应实体。
- 大模型场景只测试 selector 与渲染数量，不做脆弱的像素级快照。

### L4 Electron E2E

首批只保留五条：

1. 应用启动，安全窗口渲染。
2. 新建型材，修改长度，BOM 同步。
3. 保存 `.alu`，关闭并重新打开，内容一致。
4. 导入自定义 definition，工程可引用且导出包内包含它。
5. 导出 CSV，内容与界面最终 BOM 一致。

E2E 每次使用独立临时 `userData`，不得污染真实零件库和最近工程。

## 黄金样例

`test/fixtures/mobile-overbed-table-v1/` 是第一个领域级 golden fixture：

- 输入床最外沿宽、床垫高、动态余量、立柱截面和桌面参数。
- 断言内净宽、骨架外宽、桌面宽、床垫上方净高。
- 断言大跨度、移动侧摆、脚轮地板保护和主节点连接警告存在。
- 不断言未确认脚轮或节点加工的真实下单值。

后续至少增加：短跨 2020 柜体、3030 常规桌、槽内嵌板冲突、连接件缺配套螺栓、工程目录 revision 冲突。

## case 绑定计划

| 产品行为 | 自动化落点 |
| --- | --- |
| `editor.profile-modeling` | `src/domain/model/__tests__/profile.test.ts` + renderer component test |
| `editor.history` | `src/domain/commands/__tests__/history.test.ts` |
| `project.portable-package` | `src/main/features/project/__tests__/archive.test.ts` + Electron E2E |
| `bom.deterministic-generation` | `src/domain/bom/__tests__/generate.test.ts` + golden fixtures |
| `bom.manual-and-adjustments` | `src/domain/bom/__tests__/adjustments.test.ts` |
| `catalog.custom-parts` | catalog parser/service integration test |
| `rules.explainable-validation` | rule fixture matrix |
| `ai.versioned-commands` | command schema + dry-run contract test |

## 自动化门禁

计划中的命令：

```text
pnpm typecheck       # node 与 renderer 两套 tsconfig
pnpm lint            # oxlint
pnpm format:check    # oxfmt --check
pnpm boundaries      # 进程、domain、vendor import 防火墙
pnpm spec-gate       # 产品行为账本 diff 约束
pnpm test:run        # Vitest 全量非 watch
pnpm build           # electron-vite build
pnpm test:e2e        # Playwright Electron 关键闭环
pnpm check           # typecheck + lint + format + boundaries + spec-gate
pnpm ready           # check + test:run + build；发包前再显式加 e2e
```

`boundaries` 至少检查：

- renderer 不引用 `electron` 或 `node:*`。
- domain 不引用 Electron、React、Three、Zustand、Node。
- shared 不引用 main/renderer。
- vendor 类型不泄漏到 domain。
- main 的工程读写只从校验后的文件选择结果进入。

## 打包回归

进入 P5 后增加：

- `app.asar` 不包含源码、测试、docs、source map、未使用平台二进制。
- macOS arm64/x64 与 Windows x64 构建脚本存在且能启动。
- preload 产物存在；BrowserWindow 安全选项通过单测。
- 打包版保存/重开 `.alu` 和 CSV 导出 smoke。

## 完成定义

一个行为只有在以下条件同时满足时才算完成：schema、实现、产品 case 测试/证据、错误文案、文档当前态和至少一个真实 fixture 全部对齐。
