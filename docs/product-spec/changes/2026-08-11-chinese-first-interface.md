# chinese-first-interface

> 状态：已实现，已验证。

## Why

ALU 的主要使用者需要先看到简体中文界面和中文产品说明。英文仍需完整可用，但不再承担首次启动与 GitHub 默认文档入口。

## Delta

### CHANGED `editor.default-locale`

- 无本地偏好的首次启动使用 `zh-CN`，Main 原生弹窗使用同一默认值。
- renderer 与 Main 共用一个默认语言常量，避免两处设置漂移。
- 语言菜单先列简体中文，再列 English。
- 已保存的语言选择继续优先，不强制重置现有用户。

### CHANGED `distribution.default-readme`

- 根目录 `README.md` 改为简体中文，顶部保留明确的英文入口。
- 完整英文文档放在 `README.en.md`。
- 英文 README 和英文图文示例写明切换路径：点击顶部工具栏的地球图标，选择 `English` 或 `简体中文`。
- 文档说明语言选择会持久化，并同步到打开、保存和未保存提醒等原生弹窗。

## Not in this change

- 不改变 `.alu` 文件格式、结构选型算法、工程数据或用户输入。
- 不根据操作系统语言自动切换，也不覆盖已有偏好。
- 不修改已发布的 v0.2.0 tag 与安装包；修正通过 v0.2.1 补丁版交付。

## Cases

- `C-chinese-first-launch-v021` 新用户首次启动显示完整简体中文界面，Main 原生文案默认值一致。
- `C-english-doc-language-switch-v021` 根 README 提供英文入口，英文文档明确说明语言切换路径、持久化和原生弹窗行为。
- `C-locale-preference-preserved-v021` 用户切换到英文后，重载、重启与保存重开流程保持英文；切回简体中文同样有效。
- `C-chinese-default-package-v021` 签名后的真实安装包首次启动为简体中文，并可切换到英文。

## Verification

- `pnpm ready`：类型、lint、格式、边界、83 条唯一产品 case、16 个测试文件 / 50 项测试和生产构建通过。
- `pnpm test:e2e`：真实 Electron 覆盖简中首启、中文保存与重载、英文切换与持久化、选型、参数、BOM、保存和重开。
- `pnpm docs:screenshots`：中英文编辑器、语言菜单、下料、选型与检查截图重新生成并人工复核。
- `pnpm package:verify` 与 `pnpm test:package`：签名后的 arm64 应用通过内容检查，并验证简中首启、英文切换、参数、BOM、保存和重开。
- `design-with-alu` 通过官方 Skill validator。

## Docs impact

同步根 README、英文 README、英文图文示例、当前行为、测试策略、架构、路线图与 v0.2.1 发布说明。
