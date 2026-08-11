# agent-first-positioning

> 状态：已实现，已验证。

## Why

现有对外叙事把“移动跨床桌”放在项目名、README 首屏、五分钟示例和 Skill 触发描述里，容易把一个回归样例误解成产品品类。同时首次启动默认中文，与英文优先的公共分发目标不一致。

## 第一性原理

- ALU 的差异不是某一件家具，而是让铝型材工程状态对人和 Agent 同时可读、可复核、可交接。
- “Agent 友好”必须落到已经存在的结构化事实：严格 `.alu`、稳定 ID/revision、显式尺寸链、确定性投影、可解释 finding 和版本化 Skill。
- 当前没有 headless 写入接口，宣传不能暗示 Agent 已能绕过桌面端直接修改工程。
- 示例用于证明尺寸链和回归行为，不能替代产品定位。
- 一个会话只显示一种系统语言；英文是首次启动默认值，简体中文保留为完整且明确的入口。

## Delta

### CHANGED `editor.default-locale`

- 无本地语言偏好的首次启动使用 `en-US`，Main 原生弹窗同样以英文为默认值。
- 语言菜单先列 English，再列简体中文；用户已保存的选择继续优先，不强制覆盖。
- renderer、内置数据、通知、错误、规则解释和原生弹窗继续完整切换，不引入中英文随机混排。

### CHANGED `demo.generic-clearance-frame`

- 新建内置示例显示为 `Parametric Clearance Frame` / `参数化跨障碍框架`。
- 新生成工程使用 `clearance-frame` usage、英文规范名称和通用 `obstacleOuterWidth`、`obstacleTopHeight`、`clearanceAboveObstacle` 参数 ID。
- 0.1.0 文件中的跨床桌名称与旧参数 ID 继续兼容显示和 3D 投影，不静默重写用户文件。
- 平嵌板卡槽、尺寸链、构件、下料和规则结果不变，只调整示例定位与新工程的机器可读命名。

### CHANGED `distribution.agent-first-copy`

- 英文 README 成为 GitHub 默认入口，简体中文使用根目录显式入口。
- 首屏先解释 `.alu` 工程真相、尺寸链、确定性输出、finding 与 Skill；跨床桌只保留为领域 fixture 链接。
- 新增中英文参数化跨障碍框架图文示例，真实截图由应用重复生成。
- `design-with-alu` Skill 改为通用铝型材框架触发与结构化交接，不再把跨床桌写进主描述或首要示例。

## Not in this change

- 不提前实现 P4 headless CLI、MCP、live attach 或外部文件重载。
- 不改变 `.alu` formatVersion、领域命令信封、BOM 聚合或规则判定算法。
- 不删除历史 fixture、changeset 或跨床桌领域说明。
- 不新增云服务、模型 API、账号或遥测。

## Cases

- `C-i18n-default-en` 新用户首次启动为完整英文界面，Main 原生文案默认英文。
- `C-simplified-chinese-entry` 简体中文入口可见、完整切换并在重载后保持，切回英文同样保持。
- `C-demo-positioning-generic` 新建示例以通用跨障碍框架名称和参数 ID 保存；旧跨床桌 `.alu` 仍可打开。
- `C-agent-first-readme` GitHub 默认 README 首屏以可验证的 Agent 友好契约为主，简中入口明确，跨床桌不承担产品叙事。

## Verification

- `pnpm ready`：类型、lint、格式、边界、73 条唯一产品 case、15 个测试文件 / 42 项测试和生产构建通过。
- `pnpm test:e2e`：真实 Electron 覆盖英文首启、英文无中文系统文案泄漏、简中入口与重载持久化、切回英文、通用 obstacle 参数、BOM、保存与重开。
- Skill 官方 validator：`design-with-alu` frontmatter、命名和目录结构有效。
- `pnpm docs:screenshots`：从真实应用重复生成中英文首屏、下料与检查截图，并人工复核可见文案与布局。
- `pnpm package:verify`：arm64 `.app` 的 ASAR 为 7.1 MiB，只保留英文与简中 locale，生产 CSP 和 fuse 配置有效。
- `pnpm test:package`：Developer ID 签名后的真实二进制完成启动、i18n、参数、BOM、保存与重开。
- `codesign --verify --deep --strict` 与 `hdiutil verify` 通过；`spctl --assess` 明确返回 `Unnotarized Developer ID`，按 prerelease 边界披露。

## Docs impact

同步根 README、简中 README、双语图文示例、Skill、当前行为、路线图与 v0.1.1 发布说明。
