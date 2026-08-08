# bootstrap-mvp

> 状态：草案，等待用户确认；尚未实现。

## Why

建立一个最小但完整的铝型材设计闭环，验证领域模型、3D 投影、工程文件和 BOM 可以使用同一份结构化数据工作。明确不在本单实现完整连接件目录、AI 对话、云服务或供应商下单。

## Delta

### ADDED `editor.profile-modeling`

用户可以在毫米坐标系中新增、选择、移动和修改矩形工业铝型材。每根型材拥有稳定 ID、规格引用、起点、方向、切长和截面朝向。

- `C-add-profile` 新增型材后，3D 画布和属性面板显示同一根构件。
- `C-edit-profile-length` 修改切长后，几何尺寸和 BOM 同步更新。
- `C-invalid-profile-length` [error] 零值、负值或非有限长度被拒绝并说明原因。
- `C-profile-axis-orientation` [boundary] X/Y/Z 三个主轴与截面朝向可区分，不因相机角度改变。

### ADDED `editor.history`

所有会改变工程的领域命令都进入统一历史；视角、面板开合等 UI 状态不进入工程历史。

- `C-undo-redo-model-command` 新增或修改型材后可以撤销和重做，结果及 BOM 一致。
- `C-history-clears-redo-branch` [boundary] 撤销后执行新命令，旧重做分支被清除。

### ADDED `project.portable-package`

工程保存为 `.alu` 版本化 ZIP 包。包内含 manifest、工程 JSON、所引用零件定义、BOM 快照和可选预览图；不包含脚本或可执行内容。

- `C-save-reopen-roundtrip` 保存后重新打开，稳定 ID、尺寸、目录引用和人工 BOM 内容无损。
- `C-embedded-catalog-portability` 工程只使用内嵌的已引用零件定义即可在另一台机器打开。
- `C-import-schema-validation` [error] 非法 schema、超限文件或危险 ZIP 路径被拒绝并给出可定位错误。
- `C-import-unknown-version` [error] 高于当前支持版本的工程不被静默降级。
- `C-atomic-save` [boundary] 保存中断不会覆盖最后一次成功文件。

### ADDED `bom.deterministic-generation`

自动 BOM 是从工程实体、节点和零件定义计算出的纯函数结果。MVP 至少生成型材规格、切长、数量和用途。

- `C-profile-bom-aggregation` 同规格、同切长、同加工条件的型材合并数量；条件不同则分行。
- `C-bom-source-trace` 每行可追溯到来源实体 ID。
- `C-bom-recompute-stable` 同一工程重复计算得到稳定排序和相同内容哈希。
- `C-bom-snapshot-drift` [boundary] 导入包内 BOM 快照与当前重算不一致时，显示“已重新计算”而不是继续使用旧快照。

### ADDED `bom.manual-and-adjustments`

BOM 同时支持人工物料行与对自动结果的显式调整。用户不能直接编辑后被下一次重算覆盖而不知情。

- `C-manual-bom-line` 用户可增加无法由模型推导的包装、工具或备注物料。
- `C-derived-bom-adjustment` 自动行可以排除、替换或增减数量，调整原因被保存。
- `C-adjustment-orphan-warning` [error] 来源自动行消失后，对应调整保留但标为失配。

### ADDED `catalog.custom-parts`

用户可以创建型材、连接件、紧固件、脚轮、板材或其他自定义零件定义。零件 ID 与 revision 是身份，显示名和文件名不是身份。

- `C-custom-part-create` 自定义零件保存后可被工程引用。
- `C-custom-part-invalid-visible` [error] 坏定义进入错误列表，不静默消失。
- `C-custom-part-conflict` [boundary] 导入同 ID 不同内容时，不覆盖现有定义；用户选择工程内使用、另存 revision 或取消。

### ADDED `rules.explainable-validation`

工程检查输出带稳定 rule ID、严重级别、涉及实体、解释、来源类型和适用范围。硬错误阻止不合法产物；经验警告允许继续但不得伪装成认证。

- `C-rule-hard-error` 负长度、缺失零件定义、接口不兼容等确定性错误阻止导出订单级产物。
- `C-rule-advisory-warning` 大跨度、移动结构侧摆、脚轮地板保护等经验规则给出警告和检查建议。
- `C-rule-no-fake-rating` [boundary] 没有厂家数据或结构计算时，不显示确定承载值或“安全”结论。

### ADDED `ai.versioned-commands`

AI 与未来模板只通过版本化领域命令修改工程。MVP 先实现命令协议和 dry-run，不接入具体模型服务。

- `C-ai-command-schema` 非法命令在改动工程前被 Zod 拒绝。
- `C-ai-command-preview` 命令可先返回将新增、修改、删除的实体与规则变化。
- `C-ai-command-undo` 已执行的 AI 命令与人工操作共用撤销历史。

## Verification

Tested build: 尚无。

| Case | 结果 | 方法与证据 |
| --- | --- | --- |
| 全部 case | 待实现 | 见 `docs/engineering/testing-strategy.md` 的绑定计划 |

## Docs impact

实现验收后：更新 `specs/editor.md`、`specs/project-file.md`、`specs/bom-and-catalog.md`、`specs/engineering-rules.md`；首个 alpha README 同步可用能力。
