# Keel 工程研究结论

研究对象：`~/ai-team-base/AI-Lab/keel`，重点为 `packages/desktop`。本次只抽取可复用工程机制，没有复制业务代码。

## 读过的关键面

- 根规范：`AGENTS.md`、`CLAUDE.md`、根 `package.json`
- Desktop 规范与配置：`packages/desktop/{AGENTS.md,package.json,electron.vite.config.ts,vitest.config.ts}`
- 三进程：`src/main/app.ts`、`src/main/core/browser-window-manager.ts`、`src/preload/index.ts`
- 契约：`src/shared/contract.ts`、`src/main/router.ts`、`src/renderer/src/orpc.ts`
- 文件型目录案例：partners 的 format/parser/service/router/tests
- 产品行为账本：`docs/product-spec/README.md`、partner memo/changeset/执行计划
- 自动化：`scripts/check-product-spec.ts`、`scripts/check-sdk-firewall.ts`、`scripts/ready.ts`
- 桌面测试：Playwright config、隔离 Electron fixture、smoke tests、安全窗口单测
- 打包：electron-builder 配置及其文件过滤/平台资源策略

## 直接采用

### 1. 三进程硬边界

Keel 明确 main/preload/renderer 权责，并通过安全窗口选项和共享契约约束跨界。ALU 采用相同边界，但由于不需要内嵌网页，`webviewTag` 直接关闭，攻击面更小。

### 2. Framework-free 中性模型

Keel 把 runtime SDK 隔离在 adapter 后面，并用 firewall 防泄漏。ALU 对应的是“厂商目录防火墙”：嘉立创等专有字段只能存在于 adapter；domain、工程文件和 AI 命令使用 ALU 中性类型。

### 3. 格式知识单点化

partners 案例把 markdown 解析/序列化集中在一个文件，强调未知字段 round-trip、坏件可见、原子落盘和文件名不作身份。ALU 将同样原则用于 `.alu` 与自定义目录：

- schema/迁移单点化；
- `id + revision` 是身份；
- 扩展字段进入显式命名空间；
- 坏定义进入错误列表；
- 保存不覆盖最后成功文件。

### 4. 文档必须被测试消费

Keel 的 product-spec 用稳定 rule/case ID、changeset 和验证表避免“计划文档完成后就死”。ALU 缩小后采用同一核心环，并在实现阶段增加 spec-gate 与 case↔test 绑定。

### 5. 小数据用全量快照

Keel partners 目录规模小时每次重扫并推全量快照，比维护增量缓存更可靠。ALU 的个人零件目录初期也采用全量 snapshot；达到实测性能拐点后再索引。

### 6. 隔离 E2E profile

Keel Playwright fixture 为每次 Electron 测试创建临时 runtime 目录。ALU 必须照做，避免测试污染真实最近工程、自定义目录和自动保存。

### 7. 自动化边界门禁

Keel 的 SDK firewall 是低成本、高价值的架构棘轮。ALU 对应 gate 检查 renderer/domain/shared/vendor 四条 import 红线，而不是依赖人工 review 记住。

## 有条件采用

- electron-builder 的平台过滤、ASAR 和打包测试：P5 再接，不在 P0 复制复杂发布脚本。
- Zustand + Immer：P1 先用项目快照历史；证实嵌套更新和内存成本需要后再引入 Immer patch。
- 目录 watch：用户要求外部直接编辑目录时再上；P3 前普通导入/导出足够。

## 明确不采用

### Monorepo

ALU 目前只有一个桌面应用。复制 workspaces、shared package 和多包 root gate 只会增加路径与发布复杂度。

### oRPC over MessagePort

Keel API 面大、带流式事件，oRPC 合理。ALU P1 只有少量 project/catalog/export 方法，显式 IPC + Zod 更直观。出现真实样板痛点后再评估。

### Plugin 系统和 backend

自定义 BOM 不等于可执行插件。声明式 PartDefinition 和工程内嵌目录已能覆盖目标；执行任意脚本会显著扩大安全和兼容成本。

### Keel 的超大 composition root

Keel `src/main/index.ts` 因业务成熟而承担大量装配。ALU 从第一天按 feature 提供 `registerXFeature()`，main index 只负责生命周期和组合，避免重复演化成单文件入口。

## 对 ALU 的具体影响

| Keel 经验                 | ALU 落点                                                   |
| ------------------------- | ---------------------------------------------------------- |
| runtime SDK firewall      | vendor/domain/renderer import firewall                     |
| partner profile parser    | `.alu` schema + catalog parser + visible errors            |
| product-spec              | 当前行为/changeset/memo/roadmap 四层                       |
| isolated Electron fixture | 临时 userData 的保存重开 E2E                               |
| 样式依赖只在 renderer     | P1 直接使用普通 CSS，不增加未使用的构建插件                |
| security window tests     | `contextIsolation/sandbox/nodeIntegration/webviewTag` 回归 |
| packaging file filters    | P5 app.asar 内容与体积回归                                 |

## 结论

Keel 证明了所选 Electron 技术栈能在真实 macOS/Windows 桌面产品中工作。ALU 应复制它的边界和门禁，而不是复制它经过多年需求累积出的层数和依赖量。
