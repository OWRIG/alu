# 移动跨床桌 v1 黄金样例

用途：验证尺寸链、规则输出、工程保存和 BOM 重算的稳定性。`input.json.project` 直接采用 `ProjectDocumentV1` 形状，尺寸公式、context、绑定、两根主跨梁和内嵌型材 snapshot 全部显式保存；测试不得另写一套 fixture 私有公式或隐式映射。

P1 只断言 `edit` 可继续，以及当前 schema 能表达的尺寸链和场景警告。`order-draft` / `order-ready` 到 P2 才启用：届时连接拓扑与脚轮接口缺失必须阻止 `order-ready`，但不能在 P1 用无法建模的字段伪造该结论。

它不是订单，也不是完成的结构设计。P1 只放入用于验证长跨和参数绑定的两根顶框主梁；立柱、脚轮、主节点、面板实体、实际载荷、厂家截面数据和试载尚未确认，因此 fixture 只断言 P1 可表达的事实。

## 已知输入

- 床/床架最外沿宽：2100 mm
- 床垫上表面离地：500 mm
- 左右动态余量：各 25 mm
- 立柱 X 向宽度：40 mm
- 桌板左右外挑：各 20 mm
- 桌板：2270 × 500 × 18 mm（由公式得到的起始值）
- 桌面成品离地：750 mm
- 地面：木地板
- 用途：笔记本、餐食、小型投影仪
- 结构：横跨整床，两侧脚轮沿床边 Y 向移动
- 型材 definition：仅测试用 4080 矩形包络，低置信度、不可用于采购；definitionHash 按规范化 definition 计算

## 应得到

- 内净宽：2150 mm
- 骨架外宽：2230 mm
- 桌板宽：2270 mm
- 桌板下表面离床垫：232 mm（不等于最低结构净空）
- 型材 BOM：两根同 definition、切长、朝向和用途的 2230 mm 主梁聚合为一行，数量 2，并保留两个来源实体 ID

## 不应得到

- 未选脚轮前的真实立柱切长
- 未选节点前的孔位、攻丝和连接件 SKU
- 没有厂家数据的安全载荷或“结构合格”结论

## 不应触发的规则

- `connection.main-node-strength`：尚未选择主连接，不能把“未选择”误判为“选择了低刚度连接”。
- `caster.brake-accessibility`：尚未选择脚轮，没有刹车数量与可达性数据可供判断。

`dimension.connection-topology-explicit` 与 `caster.mount-interface-known` 是 P2 的延后断言，不属于 P1 `expectedFindings`。
`panel.marine-plywood-edge-seal` 同样延后到 P2 panel entity 能表达材料后再断言；P1 不从备注或 fixture 私有字段旁路推导领域规则。
