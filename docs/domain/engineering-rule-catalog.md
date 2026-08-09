# 铝型材工程规则目录

本文件记录可编码的领域知识。它不是结构设计规范，也不替代型材厂家额定数据、连接件说明或专业结构复核。

## 规则数据

每条检查结果至少包含：

```ts
type ValidationTarget = "edit" | "order-draft" | "order-ready";

type RuleFinding = {
  ruleId: string;
  severity: "error" | "warning" | "info";
  blocks: ValidationTarget[];
  entityIds: string[];
  message: string;
  rationale: string;
  evidence: {
    kind: "vendor" | "standard" | "calculation" | "field-guide" | "user";
    reference: string;
    confidence: "high" | "medium" | "low";
  }[];
  suggestedActions?: string[];
};
```

严重级别：

- `error`：事实确定的数据矛盾、引用缺失、接口不兼容，或订单就绪所需信息缺失；是否阻断由 `blocks` 明确表达，不能只看颜色或文案猜测。
- `warning`：经验风险、需要实测或缺厂家数据；允许继续建模，但导出时必须可见。
- `info`：装配顺序、测量和复紧提示。

校验目标：

- `edit`：提交领域命令。只有会破坏模型不变量的 finding 阻断。
- `order-draft`：导出可讨论、可补全的订单草稿。模型不变量仍阻断；成功产物必须带 `notForOrdering: true` 和未决项。
- `order-ready`：导出声称字段齐全的订单产物。模型错误与订单完整性错误都阻断；warning/info 仍保留在产物中。

规则引擎始终返回同一组事实 finding；调用目标只决定 `allowed = !findings.some(f => f.blocks.includes(target))`，不得通过切换目标隐藏问题或改写 severity。

### Error 阻断矩阵

| Rule ID                                                                                                             | `blocks`                             |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `geometry.positive-length`、`geometry.references-exist`、`dimension.parameter-cycle`                                | `edit`, `order-draft`, `order-ready` |
| `connection.endpoint-count`、`connection.interface-compatible`、`connection.slot-occupancy-conflict`                | `edit`, `order-draft`, `order-ready` |
| `machining.bound-to-profile-end`、`bom.definition-revision-locked`                                                  | `edit`, `order-draft`, `order-ready` |
| `dimension.connection-topology-explicit`、`connection.fastener-complete`                                            | `order-ready`                        |
| `panel.mount-method-explicit`、`caster.mount-interface-known`、`motion.envelope-clear`                              | `order-ready`                        |
| `bom.profile-cut-complete`、`bom.machining-complete`、`bom.accessories-complete`、`bom.manual-adjustment-traceable` | `order-ready`                        |

所有 warning/info 的 `blocks` 均为空数组。新增 error rule 时必须在同一 changeset 中加入本矩阵；没有阻断目标的 error 不允许进入代码。

规则的场景开关（是否移动、地面材质、是否人身承载、载荷类型）读取工程 `context` 字段；`unknown` 视为需要提示的待确认状态，不当作安全。

## A. 坐标与尺寸链

| Rule ID                                  | 级别    | 判据与输出                                                                                       |
| ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `geometry.positive-length`               | error   | 型材、板材或运动尺寸必须有限且大于 0。                                                           |
| `geometry.references-exist`              | error   | 实体、端点、连接和 definition 引用必须存在。                                                     |
| `dimension.boundary-kinds-explicit`      | warning | 同一参数不能同时代表障碍外沿、内净空、骨架外尺寸或面板尺寸；`boundaryKind` 字段使其可机器判定。  |
| `dimension.parameter-cycle`              | error   | 参数依赖成环时拒绝求值并指出环路；环内派生值不可用。                                             |
| `dimension.parameter-binding-stale`      | warning | 被绑定字段与参数派生值不一致（手工覆盖后）；导出订单级产物前必须重同步或解除绑定。               |
| `dimension.connection-topology-explicit` | error   | 横梁切长依赖“夹在立柱间”或“覆盖端面”；未选择拓扑时允许概念建模和订单草稿，但阻止 `order-ready`。 |
| `dimension.panel-derived-from-frame`     | warning | 误差敏感面板若只来自理论尺寸，提示先装框架实测。                                                 |

尺寸链公式以派生参数（线性组合）表达，求值本身恒一致；需要检查的是依赖成环与绑定失同步，`内净空 = 障碍外沿 + 两侧余量` 这类关系不再依赖人工声明比对。

固定坐标：X 左右/横跨，Y 前后/移动，Z 高度。任何 UI 视角变化都不能改变工程轴含义。

## B. 型材选型与载荷路径

| Rule ID                             | 级别    | 判据与输出                                                                                                                                     |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `structure.load-path-described`     | warning | 订单级导出前，主承重构件应有用途/载荷路径说明。                                                                                                |
| `structure.long-span-review`        | warning | 家具主梁跨度达到初始经验阈值 `1500 mm`，且没有厂家挠度数据或已验证计算时，提示增加截面高度、双梁或中间支撑。阈值只触发复核，不得输出安全结论。 |
| `structure.profile-series-advisory` | warning | 20/30/40 系只作为轻载/常规/人身或大跨度结构的起点建议，不作为合格判定。                                                                        |
| `structure.section-orientation`     | warning | 长梁的较大截面高度没有朝主要弯曲方向时提示复核。                                                                                               |
| `structure.mobile-side-sway`        | warning | 移动结构没有横向中梁、三角撑、大角板或等效抗侧摆措施时提示。                                                                                   |
| `safety.human-load-review`          | warning | 床、悬空重物、儿童攀爬或人身承载项目必须要求结构工程复核。                                                                                     |

`1500 mm` 是家具工具的低置信度初始提醒值，进入真实结构计算前必须由厂家截面属性或试验数据替换；它不能阻止建模，也不能生成额定载荷。

## C. 连接与加工

| Rule ID                                        | 级别    | 判据与输出                                                                                                              |
| ---------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `connection.endpoint-count`                    | error   | 连接件所需端点数量必须满足 definition。                                                                                 |
| `connection.interface-compatible`              | error   | 系列、槽宽、中心孔、螺纹或安装面明确不兼容时拒绝。                                                                      |
| `connection.main-node-strength`                | warning | 已选择的主承重/抗摇摆连接仅为低刚度定位件时提示改用端面攻丝螺栓、足量外置角码或厂家高强连接；未选择连接时不触发本规则。 |
| `connection.single-set-screw-not-sole-bracing` | warning | 单顶丝内置角槽不能作为移动桌或长跨结构唯一抗侧摆节点。                                                                  |
| `connection.flat-plate-secondary-only`         | warning | 共面连接板被标为唯一主连接时提示它只能辅助加固。                                                                        |
| `connection.slot-occupancy-conflict`           | error   | 连接件、滑轨、面板、螺母或线缆附件占用同一槽位并发生物理冲突。                                                          |
| `connection.fastener-complete`                 | error   | 订单级 BOM 缺连接件所需螺栓、螺母或垫片时拒绝导出完整状态。                                                             |
| `machining.bound-to-profile-end`               | error   | 孔、沉孔、通孔和攻丝必须绑定型材 ID、端点与基准。                                                                       |
| `machining.catalog-capability-confirmed`       | warning | 供应商加工能力或孔位未确认时标记待确认，不生成虚构 SKU。                                                                |

连接策略按节点分配，不要求全工程只用一种连接件。外观面可隐藏，背面和底面优先可靠与可调。

“未选择连接”与“已选择但刚度证据不足”必须分开：前者由 `dimension.connection-topology-explicit` 表达订单完整性，后者才触发 `connection.main-node-strength`。不得因为字段为 `null` 就假定用户选择了低刚度连接件。

## D. 面板

| Rule ID                              | 级别    | 判据与输出                                                         |
| ------------------------------------ | ------- | ------------------------------------------------------------------ |
| `panel.mount-method-explicit`        | error   | 面板必须选择槽内嵌、层板托平嵌或外接等安装方式。                   |
| `panel.slot-insertion-catalog-bound` | warning | 槽内插入量、槽条和板厚没有对应目录依据时，不套用 7–9 mm 等案例值。 |
| `panel.fastener-length-check`        | warning | 木板螺钉需同时核对板厚、连接件厚度和有效咬合深度。                 |
| `panel.marine-plywood-edge-seal`     | info    | 海洋板切边与孔壁需要封闭处理，减少从裸边进潮。                     |
| `panel.long-edge-support`            | warning | 大跨度层板或桌板中部没有型材支撑时提示，不把全部载荷交给板材。     |

## E. 脚轮与运动件

| Rule ID                            | 级别    | 判据与输出                                                                                                                                        |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `caster.mount-interface-known`     | error   | 脚轮安装方式、孔型/螺纹和安装总高缺失时，不能计算立柱订单长度。                                                                                   |
| `caster.wood-floor-soft-tread`     | warning | 木地板使用硬尼龙或未知轮面时，建议软质聚氨酯/橡胶轮。                                                                                             |
| `caster.brake-accessibility`       | warning | 只有已选择脚轮且有足够刹车数量/可达性数据时才评估；脚踩不可达或制动轮不足时提示。未选择脚轮由 `caster.mount-interface-known` 表达，不触发本规则。 |
| `caster.support-polygon`           | warning | 高而窄结构的重心运动范围可能越出脚轮支撑多边形时提示扩大底座。                                                                                    |
| `caster.preload-nuts-before-close` | info    | 板式脚轮和槽内螺母应在型材端部封闭前预埋。                                                                                                        |
| `motion.envelope-clear`            | error   | 脚轮、滑轨、被褥、踢脚线或家具的运动包络明确碰撞。                                                                                                |
| `motion.cable-routing-safe`        | warning | 投影仪或电器线缆进入脚轮路径时提示设置挂点或拖链。                                                                                                |

## F. BOM 与订单完整性

| Rule ID                           | 级别    | 判据与输出                                                      |
| --------------------------------- | ------- | --------------------------------------------------------------- |
| `bom.profile-cut-complete`        | error   | 型材行必须有编号、规格、切长、数量、朝向和用途。                |
| `bom.machining-complete`          | error   | 每项加工必须有型材 ID、端点、尺寸、孔位和基准。                 |
| `bom.accessories-complete`        | error   | 连接件、紧固件、脚轮、端盖和槽条按设计引用完整。                |
| `bom.definition-revision-locked`  | error   | 工程引用的 definition 缺精确 revision 或内嵌快照。              |
| `bom.unknown-vendor-data-visible` | warning | SKU、价格或厂家能力未知时显示“待当前目录确认”，不留空装作完整。 |
| `bom.manual-adjustment-traceable` | error   | 人工替换/排除/增量必须保留目标和原因来源。                      |

## G. 装配与验收

| Rule ID                                  | 级别 | 判据与输出                                             |
| ---------------------------------------- | ---- | ------------------------------------------------------ |
| `assembly.preload-before-close`          | info | 内置角槽、滑块螺母和封闭槽零件在封口前预埋。           |
| `assembly.initial-tightening`            | info | 初装约八成紧，校正水平、垂直和对角线后终拧。           |
| `assembly.frame-before-sensitive-panels` | info | 先装框架并实测，再定误差敏感的门板、抽屉面或嵌板。     |
| `assembly.progressive-load-test`         | info | 移动家具低位渐进试载，检查制动、抬轮、挠度和节点松动。 |
| `assembly.retighten`                     | info | 完成试载与使用一段时间后复紧连接。                     |

## 跨床桌模板的附加检查

输入必须包含床/床架最外沿宽 `B`、床垫上表面高度 `M`、两侧动态余量 `G`、成品高 `H`、桌面深度 `D`、板厚 `P`、脚轮安装总高 `C` 和顶/底框 Z 向占高。

```text
内净宽 I = B + 左余量 + 右余量
骨架外宽 F = I + 左立柱宽 + 右立柱宽
外挑桌板宽 T = F + 左外挑 + 右外挑
平嵌槽内净宽 = F - 2 × 围框宽
平嵌槽内净深 = 顶框外深 - 2 × 围框宽
平嵌桌板尺寸 = 槽内净尺寸 - 2 × 单边安装缝
立柱切长 L = H - P - 顶框占高 - 底座占高 - C
桌板下表面离床垫 = H - P - M
```

以上公式全部是线性组合，直接落成工程内的派生参数定义；模板不携带私有计算逻辑。安装方式必须在外挑与平嵌尺寸链中明确选择，不能把同一个 `tabletopWidth` 同时解释成顶框外宽和板材宽。桌板下表面距离不是最低结构净空；还必须减去顶框向下占高。P1 样例另外显示“主梁下实际净空”。

`C`、连接拓扑或框架占高缺任一项时，允许完成概念模型，但不得输出真实立柱下单长度。

## 证据升级

经验规则进入代码时必须带来源和置信度。获得厂家截面属性、连接件额定数据、公开标准或真实试验后，新增 evidence 并通过 changeset 调整规则；不能直接把“网上经验”改写成高置信度结论。
