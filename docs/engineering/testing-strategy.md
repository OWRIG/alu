# 测试与质量门禁

## 原则

1. 断言产物，不用 mock 调用次数替代业务正确性。
2. 领域纯函数测试最多、Main 文件边界测试其次、Renderer 交互测试适量、Electron E2E 保持少而关键。
3. 每个产品 case 要绑定自动化或明确的人工证据。
4. 坏工程、坏目录和不完整 BOM 必须可见，不能以“加载为空”通过测试。

## 分层

### L0 Schema 与规范化

- Zod 接受合法 v1、拒绝未知顶层字段和非有限数值。
- canonical JSON 对对象键顺序不敏感；mm 值量化到 0.01 后稳定。
- designHash 排除 projectId/revision/meta/snapshot，fileHash 覆盖完整保存字节，bomHash 只覆盖 BOM；三者使用各自 fixture，不能互换断言。
- 参数求值：线性组合、拓扑排序、环检测、缺失引用报错。
- format migration fixture 可重复、幂等且不丢扩展字段。
- 命令 schema 拒绝旧 revision、非法 ID 和越界数量。
- 命令拒绝返回稳定错误码与 JSON Pointer；批量任一条失败，整批不落地。
- 已知 `structuralSizing` 扩展校验版本、梁/参数引用、梁数、候选唯一性和接口体系；保存重开后研究输入完全一致。
- CLI 对同一初始 designHash 与命令批保持 UI 内核结果一致；交付 JSON、Markdown 与 PDF 必须共享 reportVersion、BOM hash、finding 和边界。

### L1 领域规则

- X/Y/Z 尺寸链与截面朝向。
- 参数绑定：创建即写值、`SetParameters` 一步同步、手工覆盖后失同步可见且不被自动改写。
- 型材长度、节点引用、接口兼容和占槽冲突。
- BOM 聚合键、配套紧固件、加工项和来源追溯。
- manual/adjustment/orphan 行为。
- 经验警告与硬错误的级别不会互换。
- P1 只启用 `edit`；P2 启用 `order-draft` 与 `order-ready` 后仍使用同一组 finding，只按 finding 的 `blocks` 判断操作是否允许。
- P2 的 `order-draft` 成功时始终带 `notForOrdering` 与未决项；`order-ready` 被订单完整性 error 阻止。
- 没有证据时不生成确定承载值。
- 梁筛选对均布、集中和自重分项使用黄金数值；只在挠度、截面高度与接口体系均通过后按单位质量选择。

### L2 文件与 IPC

- `.alu` 保存、重开和再保存 round-trip。
- 同目录临时文件 + rename；模拟失败时原文件不变。
- 超限、损坏 JSON、未知文档版本和未知顶层字段拒绝，错误可定位。
- 未来 ZIP 容器单独测试 `containerVersion`、条目白名单和 zip-slip；不得把容器版本当作 `formatVersion`。
- 内嵌目录冲突不覆盖个人目录。
- 每个 IPC channel 的入参和输出都走 schema。
- project/settings handler 拒绝当前应用 renderer URL 之外的 `senderFrame.url`。
- Renderer 无法获得任意文件系统或 shell 能力。

### L3 Renderer

- Zustand command 提交、撤销、重做和 redo 分支清理。
- 属性面板修改后，工程 snapshot、画布投影和 BOM 面板一致。
- 规则错误定位到对应实体。
- 结构载荷提交只产生一步历史；选型页、检查页和保存 snapshot 同步更新。
- 中英文语言包键与插值变量严格对齐；内置项目内容、规则和领域错误不向另一种界面语言泄漏。
- 大模型场景只测试 selector 与渲染数量，不做脆弱的像素级快照。

### L4 Electron E2E

P1 保留一条覆盖关键闭环的 workflow：

1. 应用启动，安全窗口渲染。
2. 首次启动默认简体中文，切换英文后界面和内置领域文案同步变化，重载后保持选择，也能切回简体中文。
3. 新建型材并绑定参数，修改输入参数，几何与 BOM 同步。
4. 保存 `.alu`，关闭并重新打开，内容一致。
5. 打开选型页核对默认 7 个 SKU；增大集中载荷后入选项确定性切换，恢复输入后结果恢复。

P3 再增加：

6. 导入自定义 definition，工程可引用且导出文件内包含 snapshot。
7. 导出 CSV，内容与界面最终 BOM 一致。

E2E 每次使用独立临时 `userData`，不得污染真实零件库和最近工程。

## 黄金样例

`test/fixtures/mobile-overbed-table-v1/` 是第一个领域级 golden fixture：

- `input.json.project` 直接符合 `ProjectDocumentV1`，包含 context、输入/派生参数、绑定、两根主跨梁和 definition snapshot；测试不经过私有 fixture adapter。
- 尺寸公式直接落成派生参数定义，P1 参数求值纯函数直接消费，不依赖 UI。
- 断言内净宽、骨架外宽、桌面宽、桌板下表面离床垫距离。
- 断言两根同聚合键的主梁生成一行 profile BOM、数量 2、来源实体完整，并在重复重算时保持 bomHash。
- 断言结构化研究取代通用长跨警告，并稳定得到计算型 finding；脚轮安装总高缺失会阻断订单目标，侧摆、木地板轮面和线缆边界仍可见。
- 断言 7 个具体厂家候选的挠度、高度、接口体系、质量排序与默认 `NFSL8-4080` 结果。
- P1 断言 `order-draft` / `order-ready` 尚不支持；`dimension.connection-topology-explicit` 与 `caster.mount-interface-known` 的阻断断言延后到 P2 节点 fixture。
- 断言未选连接不会误触发 `connection.main-node-strength`，未选脚轮不会误触发 `caster.brake-accessibility`。
- 不断言未确认脚轮或节点加工的真实下单值。

后续至少增加：短跨 2020 柜体、3030 常规桌、槽内嵌板冲突、连接件缺配套螺栓、工程目录 revision 冲突。

## case 绑定计划

| 产品行为                                                                           | 自动化落点                                                                                |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `editor.dimension-parameters`                                                      | `src/domain/params/evaluate.test.ts` + `src/domain/commands/apply.test.ts` + Electron E2E |
| `editor.profile-modeling`                                                          | `src/domain/commands/apply.test.ts` + Electron E2E                                        |
| `editor.history`                                                                   | `src/domain/commands/history.test.ts` + Electron E2E                                      |
| `project.portable-package`                                                         | `src/main/features/project/project-file.test.ts` + Electron E2E                           |
| `bom.deterministic-generation`                                                     | `src/domain/bom/derive.test.ts` + golden fixture + Electron E2E                           |
| `rules.explainable-validation`                                                     | `src/domain/rules/evaluate.test.ts` + schema/command error tests                          |
| `structure.beam-sizing-study`                                                      | `src/domain/structural/evaluate.test.ts` + parse/command tests + Electron E2E             |
| `editor.locale-system`、`editor.task-oriented-layout`                              | `src/renderer/src/i18n/i18n.test.ts` + Electron E2E                                       |
| `desktop.native-locale`、`desktop.ipc-origin`                                      | Electron E2E + `src/main/core/ipc-security.test.ts`                                       |
| `distribution.macos-arm64`                                                         | `package:verify` + 打包应用 Playwright workflow                                           |
| `distribution.docs-and-skill`                                                      | 两张核心截图生成 + Skill validator + 图文样例人工复核                                     |
| `editor.connection-modeling`、`model.panel-and-caster`、`bom.complete-order-draft` | P2 connection/interface/BOM fixture matrix                                                |
| `bom.manual-and-adjustments`                                                       | `src/domain/bom/__tests__/adjustments.test.ts`                                            |
| `catalog.custom-parts`                                                             | catalog parser/service integration test                                                   |
| `agent.versioned-commands`、`agent.headless-cli-and-skill`                         | P4 command/CLI contract + Skill smoke                                                     |
| `distribution.packaged-headless-cli`、`distribution.codex-integration-installer`   | installer unit tests + package content check + packaged launcher smoke                    |
| `agent.project-handoff`                                                            | report model tests + CLI export contract + packaged PDF render smoke                      |

## 自动化门禁

计划中的命令：

```text
pnpm typecheck       # node 与 renderer 两套 tsconfig
pnpm lint            # oxlint
pnpm format:check    # oxfmt --check
pnpm boundaries      # 进程、domain、vendor import 防火墙
pnpm test:run        # Vitest 全量非 watch
pnpm build           # electron-vite build
pnpm test:e2e        # Playwright Electron 关键闭环
pnpm package:mac     # macOS arm64 DMG + ZIP + .app
pnpm package:verify  # ASAR、可执行文件、语言包与体积回归
pnpm test:package    # 对打包后的 .app 重跑关键闭环
pnpm check           # typecheck + lint + format + boundaries
pnpm ready           # check + test:run + build；发包前再显式加 e2e
```

`boundaries` 至少检查：

- renderer 不引用 `electron` 或 `node:*`。
- domain 不引用 Electron、React、Three、Zustand、Node。
- shared 不引用 main/renderer。
- vendor 类型不泄漏到 domain。
- main 的工程读写只从校验后的文件选择结果进入。

## 打包回归

当前 macOS arm64 发布切片要求：

- `.app` 包含可执行文件和单一 `app.asar`，不产生 `app.asar.unpacked`。
- Electron locale 只保留 `en-US` 与 `zh-CN`，ASAR 不超过 20 MiB。
- fuses 关闭 RunAsNode、NODE_OPTIONS、CLI inspect 和 file 协议额外权限，启用 ASAR 完整性与 only-load-from-ASAR；生产 renderer 使用受限 `alu://app` 协议。
- Playwright 通过仅绑定回环地址的临时 Chromium CDP 驱动打包二进制，完成语言切换、参数/BOM、保存与重开；不为测试重新启用 Node inspector fuse。
- `codesign`、Gatekeeper 与公证状态作为发布证据单独记录，不用“构建成功”替代。

Windows、macOS x64/universal、CSV 导出和自动更新仍是后续范围。

## 完成定义

一个行为只有在以下条件同时满足时才算完成：schema、实现、产品 case 测试/证据、错误文案、文档当前态和至少一个真实 fixture 全部对齐。
