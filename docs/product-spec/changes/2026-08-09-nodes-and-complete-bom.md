# nodes-and-complete-bom

> 状态：P2 后续草案，未批准、未实现。P1 已验收；本单等待单独确认。

## Why

在 P1 参数化型材闭环之上增加连接、加工、板材和脚轮，使 BOM 从“型材切割清单”升级为可复核但仍允许待确认项的订单草稿。

## Delta

### ADDED `editor.connection-modeling`

- `C-connection-by-interface-id` 连接端点引用型材 definition 中的稳定接口 ID；侧面接口使用型材局部截面坐标，不依赖世界轴或相机方向。
- `C-connection-interface-incompatible` [error] 明确不兼容的系列、槽口、中心孔、螺纹或安装面被拒绝并定位到节点。
- `C-connection-slot-conflict` [error] 两个零件占用同一槽段且包络冲突时，冲突实体和接口可定位。
- `C-profile-drag-snap-command` 拖拽、吸附和 gizmo 只产生候选领域命令，通过校验后一次提交并可撤销。

### ADDED `model.panel-and-caster`

- `C-panel-mount-explicit` 板材记录尺寸、安装方式和固定接口；未选安装方式不能标记订单就绪。
- `C-caster-interface-explicit` 脚轮记录安装接口、安装总高、轮面和制动信息；缺失值保持待确认，不猜测补齐。
- `C-motion-envelope-conflict` [error] 已建模的脚轮、板材或障碍运动包络发生明确碰撞时阻止订单就绪。

### ADDED `bom.complete-order-draft`

- `C-connection-bom-composition` 连接 definition 同时派生连接件、紧固件和必要加工，来源可追溯到节点。
- `C-machining-single-source` 孔、攻丝和沉孔只来自连接派生或显式人工加工记录，不在型材端点重复保存。
- `C-order-draft-not-for-ordering` 缺厂家数据或接口确认时仍可导出草稿，但必须携带 `notForOrdering` 和未决项。
- `C-order-ready-blocked-by-missing-data` [error] 连接拓扑、脚轮安装总高或必要紧固件缺失时，订单就绪导出被阻止。

### ADDED `project.node-schema-version`

- `C-v1-to-node-schema-migration` P1 工程通过纯函数迁移到包含节点实体的下一文档版本；迁移可重复且不改变 P1 设计哈希。
- `C-local-profile-frame-stable` [boundary] X/Y/Z 主轴和绕轴旋转得到稳定的局部 `u/v` 截面坐标，保存重开后接口引用不漂移。

## Verification

P2 开始前补充小桌与跨床桌节点 fixture，并把每个 case 映射到领域测试或 Electron 交互测试。
