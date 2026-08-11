# 当前产品行为

P1 alpha 已于 2026-08-09 实现并通过自动化验收；2026-08-11 收紧为 Agent-first 对外定位，并增加可追溯的具体 SKU 梁筛选。编辑器首次启动默认英文，并保留完整简体中文入口，原生文件弹窗使用同一语言；macOS arm64 发布切片已完成签名、内容回归和打包应用 smoke，当前未做 Apple 公证。当前行为按用户可观察边界拆成四份：

- [编辑器与尺寸链](editor.md)
- [工程文件](project-file.md)
- [型材 BOM](profile-bom.md)
- [工程检查](engineering-rules.md)

本目录只描述已经验证的行为。当前梁筛选不是完整结构分析；连接节点、完整订单 BOM、自定义目录与 Agent CLI 仍在后续 changeset 中，不能从当前实现推断为可用。
