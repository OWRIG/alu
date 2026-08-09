# ALU

工业铝型材概念设计与复核桌面工具。输入障碍物包络、动态余量、完成高度和桌板装配参数，ALU 会同步生成型材骨架、平嵌桌板、型材切料清单与待复核项。

![ALU 中文编辑器](docs/images/editor-zh.png)

> v0.1.0 alpha 只输出概念模型和型材切料清单，不是订单、施工图、结构计算或安全认证。

## 现在能做什么

- 参数尺寸链：修改床宽、余量、桌高、型材占位或桌板安装缝，关联构件一次更新。
- 平嵌桌板：木板落入四边顶框形成的卡槽，默认每边保留 2 mm 名义安装缝。
- 3D 复核：型材、桌板、托条概念体与床体参照使用同一毫米坐标系。
- 型材切料清单：按型材 revision、切长、朝向和用途确定性聚合，并保留来源构件。
- 工程检查：显示稳定 rule ID、原因、证据置信度和下一步，不把经验提醒冒充计算结论。
- `.alu` v1：严格校验、原子保存、最近工程、重开时重算 BOM。
- 完整 `zh-CN` / `en-US`：renderer、内置样例、规则解释和原生文件弹窗使用同一语言。
- 受限桌面边界：renderer 无 Node/Electron；preload 只暴露工程与语言设置接口；IPC 校验调用来源。

## 安装

### macOS Apple Silicon

从 [v0.1.0 prerelease](https://github.com/OWRIG/alu/releases/tag/v0.1.0) 下载 `ALU-0.1.0-arm64.dmg`，拖入 Applications。当前包已做 Developer ID 签名但尚未 Apple 公证，Gatekeeper 可能阻止首次打开；请先核对 Release 的 SHA-256 和源码，再按发布说明确认打开。

### 从源码运行

需要 Node.js 22+ 与 pnpm 10。

```bash
git clone https://github.com/OWRIG/alu.git
cd alu
pnpm install
pnpm dev
```

## 五分钟示例

以跨 2,200 mm 床宽的移动桌为例：

1. 在“空间边界”把床架最外沿宽改为 `2200 mm`，左右动态余量各保留 `25 mm`。
2. ALU 得到槽内净宽 `2250 mm`、框架外宽 `2330 mm`。
3. 桌板按每边 `2 mm` 安装缝得到 `2246 × 416 × 18 mm`，平放到顶框卡槽内。
4. 在“下料”核对 4 个切料组、10 根型材；在“检查”处理长跨梁、移动侧摆、脚轮和线缆提醒。
5. 保存 `.alu`，把未决项连同文件一起交给下一轮现场测量或工程复核。

![平嵌桌板尺寸链](docs/images/flush-panel-fit.svg)

完整图文步骤见 [移动跨床桌示例](docs/examples/mobile-overbed-table.md)。

## Agent Skill

仓库自带可安装的 [`design-with-alu`](skills/design-with-alu/SKILL.md) Skill。它会先收集空间和载荷约束，再通过 ALU 检查模型、切料与规则，并明确阻止把 alpha 输出当成可下单 BOM。

```bash
mkdir -p ~/.codex/skills
cp -R skills/design-with-alu ~/.codex/skills/
```

安装后可直接说：

```text
Use $design-with-alu to review this overbed-table project and summarize the unresolved checks.
```

Skill 只编排当前桌面能力；v0.1 没有受支持的 headless 写入接口，也不应手改 `.alu` JSON。

## 验证与打包

```bash
pnpm ready           # 类型、lint、格式、边界、规格门禁、单测、生产构建
pnpm test:e2e        # Electron：语言切换、编辑、BOM、保存、重开
pnpm package:mac     # 生成 Apple Silicon DMG、ZIP 和解包后的 ALU.app
pnpm package:verify  # 检查 ASAR、语言包、可执行文件和体积上限
pnpm test:package    # 对真实打包后的 ALU.app 重跑关键闭环
```

`electron-builder.yml` 启用 ASAR、hardened runtime 和 Electron fuses；生产页面由受限 `alu://app` 协议加载，仅把主进程需要的运行时依赖装入应用。签名会使用本机可用的 Developer ID，公证凭据由发布环境提供。

## 明确边界

- 内置 4040/4080 是低置信度矩形包络，采购前必须核对具体厂家目录。
- 平嵌板尺寸是名义值。先组框、校正对角线并实测卡槽，再下单误差敏感的木板。
- v0.1 的 BOM 不含连接件、加工、紧固件、脚轮、桌板和附件，不能直接下单。
- 长跨梁、移动结构、木地板轮面与线缆提示是复核清单，不是承载结论。
- 参数模板编辑、拖拽吸附、节点连接和完整采购 BOM 属于后续 changeset。

## 文档

- [图文示例](docs/examples/mobile-overbed-table.md)
- [当前产品行为](docs/product-spec/specs/README.md)
- [总体架构](docs/engineering/architecture.md)
- [领域模型与 `.alu` 格式](docs/engineering/domain-model.md)
- [测试与质量门](docs/engineering/testing-strategy.md)
- [工程规则目录](docs/domain/engineering-rule-catalog.md)
- [路线图](docs/product-spec/roadmap.md)
