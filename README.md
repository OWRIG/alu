<h1 align="center">
  <img src="build/icon.svg" alt="ALU" width="64" valign="middle" /> ALU
</h1>

<p align="center">
  <a href="https://github.com/OWRIG/alu"><img src="https://img.shields.io/github/stars/OWRIG/alu?style=flat&amp;label=%E2%98%85&amp;color=4EA7FF" alt="GitHub stars" /></a>
  <a href="https://github.com/OWRIG/alu/releases"><img src="https://img.shields.io/github/v/release/OWRIG/alu?include_prereleases&amp;sort=semver&amp;label=release&amp;color=4EA7FF" alt="Latest release" /></a>
  <img src="https://img.shields.io/badge/macOS-Apple%20Silicon-15191E?style=flat" alt="Platform: macOS Apple Silicon" />
  <img src="https://img.shields.io/badge/status-alpha-F2A65A?style=flat" alt="Status: alpha" />
</p>

<p align="center">
  <sub><strong>简体中文</strong> · <a href="README.en.md">English</a></sub>
</p>

<p align="center">
  <strong>面向 Agent 的工业铝型材设计工作台</strong><br />
  把实测约束、精确型材 SKU、3D 模型和下料结果放进同一份可验证工程。
</p>

<p align="center">
  <kbd>Agent Skill</kbd>&nbsp;
  <kbd>.alu v1</kbd>&nbsp;
  <kbd>参数尺寸链</kbd>&nbsp;
  <kbd>精确 SKU</kbd>&nbsp;
  <kbd>确定性 BOM</kbd>&nbsp;
  <kbd>离线优先</kbd>
</p>

<h3 align="center">
  <a href="https://github.com/OWRIG/alu/releases/tag/v0.2.1"><ins>下载 macOS 版 ALU</ins></a>
</h3>

<p align="center">
  <img src="docs/images/editor-zh.png" alt="ALU 简体中文编辑器" width="1200" />
</p>

> ALU 0.2.1 alpha 提供可追溯的理想梁挠度筛选，但仍不是订单、施工图、完整结构分析、额定载荷或安全认证。

## 为什么做 ALU

我日常用 Mac，MayCAD 用不了，找了台 Windows 电脑试了下，感觉还是挺费劲的，上手成本也不低。后来又研究了下嘉立创，能自动下单很方便，但是网页端实在是不太行。也试过让 Codex 通过 `browser-use` 固化一套 Skill，自动编排和下单，结果还是问题重重，没法适配。想着干脆自己做一个。

我做这个更多还是想自己先设计个大概，然后在物理世界里做出来。中间拆设计、建模型挺费劲的，还是交给 AI 吧。也希望有更多同道中人加入进来，提提 Issue，一起把它做得更好用。

现在 AI 可以帮我设计了，什么时候快进到机器人帮我搭好？

## 功能

<table>
<tr>
<td width="50%" valign="top">
<h3>参数尺寸链</h3>

创建、编辑和安全删除实测输入与线性派生参数。参数绑定到构件字段后，尺寸变化会同步更新几何和切长。

</td>
<td width="50%" valign="top">
<h3>单一工程数据</h3>

`.alu` v1 保存单位、稳定 ID、工程版本号、参数、构件、选型证据和规则结论。3D 只是投影，不是隐藏的数据源。

</td>
</tr>
<tr>
<td width="50%" valign="top">
<h3>精确 SKU 选型</h3>

输入台面、均布和集中载荷，按有效跨度、厂家惯性矩、截面高度、自重和接口约束比较具体候选。确认后把 SKU 显式应用到模型与下料。

</td>
<td width="50%" valign="top">
<h3>可复核输出</h3>

同一工程确定性生成型材切料清单与工程检查。每条检查项都带稳定 rule ID、原因、证据边界和下一步。

</td>
</tr>
<tr>
<td width="50%" valign="top">
<h3>四边平嵌卡槽</h3>

桌板落入四边顶框形成的槽内。名义安装缝进入尺寸链；下板前仍需组框、校方并实测槽口。

</td>
<td width="50%" valign="top">
<h3>移动结构高度链</h3>

脚轮安装总高会抬高框架底部并等量缩短立柱，完成面高度保持不变。未知值保留为 `0 / 待确认`，不会猜测具体脚轮。

</td>
</tr>
</table>

## 选型闭环

ALU 先给出当前候选集里的最小质量合格项，再由用户决定是否写回。载荷变化不会静默替换已经应用的型材。

<p align="center">
  <img src="docs/images/example-sizing.png" alt="ALU 梁选型与精确 SKU 写回" width="1200" />
</p>

## 安装

### macOS Apple Silicon

从 [v0.2.1 prerelease](https://github.com/OWRIG/alu/releases/tag/v0.2.1) 下载 `ALU-0.2.1-arm64.dmg`，打开后把 ALU 拖入 Applications。

当前构建已做 Developer ID 签名，但尚未 Apple 公证。Gatekeeper 可能阻止首次打开；操作前请核对发布页中的 SHA-256 与源码。

### 从源码运行

需要 Node.js 22+ 与 pnpm 10。

```bash
git clone https://github.com/OWRIG/alu.git
cd alu
pnpm install
pnpm dev
```

## 五分钟示例

内置示例使用通用障碍物包络，不把某一种家具写进产品模型：

1. 把“障碍物最外沿宽”改为 `2200 mm`，左右动态余量各保留 `25 mm`。
2. ALU 得到 `2250 mm` 结构内净宽、`2330 mm` 框架外宽，以及 `2246 × 416 × 18 mm` 名义平嵌板尺寸。
3. 选定脚轮后填写实际安装总高；ALU 保持 `750 mm` 完成面不变并重算立柱切长。
4. 在“选型”页核对 `12 kg` 台面、`30 kg` 均布与 `15 kg` 集中载荷，检查 7 个具体候选的推导与排除原因。
5. 确认 `NFSL8-4080` 后点击“应用到模型与下料”，再核对 3D、切料、未决检查并保存 `.alu`。

完整步骤见[参数化跨障碍框架图文示例](docs/examples/parametric-clearance-frame.zh-CN.md)。

## Agent Skill

仓库内置一套可独立使用、也可串联的 Agent Skill：

| Skill                                                                                            | 负责                                                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [`design-with-alu`](skills/design-with-alu/SKILL.md)                                             | `.alu` 工程的尺寸链、选型、模型、下料、检查和交接闭环 |
| [`select-aluminum-extrusion-profiles`](skills/select-aluminum-extrusion-profiles/SKILL.md)       | 从接口族、有效跨度、载荷与截面数据选择精确型材 SKU    |
| [`select-aluminum-extrusion-connections`](skills/select-aluminum-extrusion-connections/SKILL.md) | 连接件、紧固件、加工、槽位占用和装配顺序              |
| [`integrate-panels-with-extrusions`](skills/integrate-panels-with-extrusions/SKILL.md)           | 槽内板、四边平嵌层板、面装板、可拆板和门板            |

```bash
mkdir -p ~/.agents/skills
cp -R skills/design-with-alu \
  skills/select-aluminum-extrusion-profiles \
  skills/select-aluminum-extrusion-connections \
  skills/integrate-panels-with-extrusions \
  ~/.agents/skills/
```

安装后可以直接说：

```text
用 $select-aluminum-extrusion-profiles 根据 1,600 mm 有效跨度、载荷和高度约束，
比较精确 SKU；不要按 3030/4040 经验选型。

用 $select-aluminum-extrusion-connections 为每个节点列出连接件、加工、螺钉、
槽位占用和装配顺序。

用 $integrate-panels-with-extrusions 设计四边平嵌木板，给出实测尺寸链、支承、
留缝和下板前检查。
```

`design-with-alu` 默认使用下面的 Headless CLI 创建、预览、修改和校验 `.alu`；桌面端继续负责 3D 查看与人工调整。三项知识 Skill 也可以脱离 ALU，用于方案审查和制造交接。

### Codex 接入

```bash
pnpm install
pnpm build:cli
pnpm link --global # 可选；之后直接使用 alu
```

不安装到全局时，把下面的 `alu` 换成 `pnpm cli`：

```bash
alu create frame.alu --template demo
alu read frame.alu
alu schema command
alu dry-run frame.alu --input command.json
alu apply frame.alu --input command.json
alu validate frame.alu --target order-draft
```

`read` 返回当前 `revision`、`designHash`、工程、尺寸链、BOM 和检查结果。命令信封必须带上读取时的 `expectedProjectRevision` 与 `expectedDesignHash`；先 `dry-run`，确认 diff 后再 `apply`。所有输出都是单行 JSON，失败有稳定错误码和退出码。不要手改 `.alu`。

资料来源、2026 小红书案例蒸馏与厂家核对边界见 [2026 铝型材设计知识梳理](docs/research/aluminum-extrusion-field-guide-2026.md)。

## 当前边界

- 3D 使用简化矩形包络；采购前仍须核对厂家最新 revision。
- 切料清单不含连接件、加工、紧固件、脚轮、板材和附件，不能直接下单。
- 梁结果只覆盖理想简支挠度。节点刚度、许用应力、侧摆、倾覆、冲击、疲劳和实物验证尚未覆盖。
- 拖拽吸附、完整采购 BOM、自定义目录与 live attach 仍在后续路线图中。

## 开发与文档

```bash
pnpm ready           # 类型、lint、格式、边界、测试与构建
pnpm test:cli        # 构建 Headless CLI 并跑 Skill 闭环
pnpm test:e2e        # 真实 Electron：语言、编辑、下料、保存与重开
pnpm package:mac     # Apple Silicon DMG、ZIP 与 ALU.app
pnpm package:verify  # ASAR、语言包、可执行文件与体积上限
pnpm test:package    # 对真实安装包复跑关键闭环
```

- [图文示例](docs/examples/parametric-clearance-frame.zh-CN.md)
- [当前产品行为](docs/product-spec/specs/README.md)
- [架构与领域模型](docs/engineering/architecture.md)
- [梁选型公式、候选与证据](docs/engineering/structural-sizing.md)
- [2026 铝型材设计知识梳理](docs/research/aluminum-extrusion-field-guide-2026.md)
- [工程规则目录](docs/domain/engineering-rule-catalog.md)
- [路线图](docs/product-spec/roadmap.md)

早期跨床桌需求仍保留为[领域 fixture 说明](docs/examples/mobile-overbed-table.md)，但不再承担产品定位。
