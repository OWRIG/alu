# catalog-and-portability

> 状态：P3 后续草案，未批准、未实现。P2 验收后再确认本单。

## Why

让自定义零件、人工物料和 BOM 调整可安全流通，同时保持自动派生结果可重算、可追溯。

## Delta

### ADDED `bom.manual-and-adjustments`

- `C-manual-bom-line` 用户可增加无法由模型推导的包装、工具或备注物料。
- `C-derived-bom-adjustment` 自动行可以排除、替换或增减数量，调整原因被保存。
- `C-adjustment-orphan-warning` [error] 来源自动行消失后，对应调整保留但标为失配。

### ADDED `catalog.custom-parts`

- `C-custom-part-create` 自定义零件保存后可被工程引用。
- `C-custom-part-invalid-visible` [error] 坏 definition 进入错误列表，不静默消失。
- `C-custom-part-conflict` [boundary] 导入同 ID、同 revision、不同 definitionHash 时不覆盖；用户选择只在工程内使用、创建新 revision 或取消。

### ADDED `project.catalog-portability`

- `C-embedded-catalog-portability-p3` 工程在隔离的空本地目录中仅依靠内嵌 definition 快照即可打开并重算最终 BOM。
- `C-definition-hash-verified` [error] 内嵌 definition 内容与记录的 definition hash 不一致时拒绝作为锁定证据。
- `C-final-bom-export` CSV 与 JSON 导出内容和界面最终 BOM 一致，人工行与调整来源可区分。

## Verification

在隔离 Electron profile 中执行“导出工程 → 清空个人目录 → 导入 → 重算 BOM”闭环，并覆盖 revision 冲突。
