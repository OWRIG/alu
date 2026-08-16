# first-principles-core

> 状态：已实现，已验证。用户在 2026-08-11 的 Claude Opus 审计后明确要求执行。

## Why

ALU 当前能修改内置样例，却不能创建输入参数或派生尺寸；移动结构的立柱尺寸链没有脚轮安装总高；梁筛选得到具体 SKU 后，模型与切料清单仍引用概念包络。同时，结构研究 schema 把某个平台、四条现场证据、单一梁拓扑和三个接口体系写成封闭枚举，规则还会根据自由文本用途猜测构件角色。

这使产品承诺与实际能力错位：它更像模板配置器，而不是 Agent 可操作的铝型材设计工具。

## 第一性原理

- 尺寸链由显式输入、线性派生参数和字段绑定组成；用户与 Agent 必须能创建和修改这三类数据。
- 移动结构的 Z 向链必须从地面开始，显式包含脚轮安装总高；未知值保持为 `0 / 待确认`，不得猜测 SKU 数据。
- 结构筛选只有写回精确型材 definition，并让 3D 与 BOM 使用同一 snapshot，才算完成选型闭环。
- 截面高度上限是空间约束，实际截面尺寸是设计状态，两者不能复用同一个参数。
- 规则只消费显式状态或可计算几何，不根据显示名称、用途文案或证据平台猜语义。
- 现场证据可以为空且来源开放；它支持构造说明，不是所有梁计算的准入条件。
- 质量流程只保留能真实发现错误的门禁和少量可复现截图。

## Delta

### ADDED `editor.parameter-authoring`

- 增加输入参数和线性派生参数的 upsert/remove 领域命令。
- 参数删除在仍被公式、绑定或结构研究引用时明确拒绝，不做隐式级联。
- 左侧参数面板可新建、编辑和删除输入/派生参数；空白工程因此成为可用入口。

### ADDED `dimension.caster-installed-height`

- 默认移动框架增加 `casterInstalledHeight` 输入，初值为 `0`，表示尚未确认具体脚轮。
- 立柱起点、立柱切长和底梁中心高都使用该输入；顶面高度保持不变。
- 移动工程缺少正的安装总高时产生 `caster.installed-height-required`，阻止订单草稿与订单就绪，但不阻止继续编辑。

### ADDED `structure.apply-selected-profile`

- 梁研究可声明实际截面宽/高参数；截面高度上限使用独立参数。
- 用户显式应用当前入选项后，为关联梁创建带厂家、SKU、来源和精确截面包络的 definition snapshot，替换概念 definition，并同步实际截面参数。
- 3D、切料清单和规则随后都读取该 snapshot；载荷变化导致入选项改变时，不静默替换已应用型材。
- 实际截面参数与 snapshot 不一致时产生 `structure.section-parameter-mismatch`。

### CHANGED `structure.open-study-schema`

- `scope`、接口体系和假设 ID 改为开放稳定 ID；所需接口体系允许为空。
- 构造证据允许为空，来源字段不再绑定任何内置记录。
- 默认样例可以保留项目内的构造资料，但它们不再是新研究的 schema 门槛。

### CHANGED `rules.no-purpose-heuristics`

- 长跨提醒基于未被结构研究覆盖的水平长构件，不再匹配 `purpose` 文本。
- 移动稳定性提示不再因为用途名称包含 `brace` 等词而消失；在节点/连接拓扑尚未建模时，统一表述为未验证边界。
- 软轮面与线缆建议降为信息提示；可解析的脚轮安装总高使用独立阻断规则。

### REMOVED `process.false-gates`

- 删除只检查固定旧 changeset 的 `spec-gate`。
- 文档截图脚本只维护中文主界面与选型闭环两张图，不再伪造 macOS 窗口按钮或维护中英文页面矩阵。

## Cases

- `C-parameter-definition-authoring`：输入/派生参数可创建和更新，派生值确定性重算。
- `C-parameter-remove-reference-safe`：仍被公式、绑定或研究引用的参数不能删除。
- `C-caster-height-in-vertical-chain`：脚轮安装总高变化会等量抬高框架底部、缩短立柱，完成面高度保持不变。
- `C-caster-height-required`：移动工程的安装总高未知时阻止订单目标并给出可执行修复项。
- `C-sizing-apply-to-model-and-bom`：应用 `NFSL8-4080` 后，两根梁、3D definition 和 BOM 都使用同一厂家 SKU snapshot。
- `C-section-parameter-consistency`：实际截面参数与 definition 包络不一致时产生稳定 finding。
- `C-structural-study-open-evidence`：空构造证据和目录自定义接口体系可以保存重开。
- `C-rule-role-not-in-purpose-copy`：修改构件用途文案不会改变长跨或移动稳定性规则集合。

## Not in this change

- 不建模完整脚轮 definition、孔型、额定载荷、轮面、制动和采购 BOM。
- 不实现连接件、加工、紧固件、倾覆或整机安全认证。
- 不实现拖拽吸附、通用 CAD、MCP 或后台服务。
- headless CLI 仍是下一独立切片；本轮先让领域命令和桌面编辑器具备完整尺寸链创作能力。

## Verification

- `pnpm ready`：58 个领域/应用测试通过，类型、lint、格式、边界与生产构建通过。
- `pnpm test:e2e`：真实 Electron 中完成参数创建、脚轮高度联动、SKU 写回、BOM、保存重开与语言切换。
- `pnpm docs:screenshots`：生成并目视核对中文主界面与选型闭环两张文档图。
- Skill 通过 `skill-creator/scripts/quick_validate.py` 校验。
