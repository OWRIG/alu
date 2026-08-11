# 当前产品行为

P1 alpha 已于 2026-08-09 实现；2026-08-11 收紧为 Agent-first 对外定位，并增加参数定义编辑、脚轮安装总高尺寸链、可追溯的具体 SKU 梁筛选、显式模型/BOM 写回与 Headless CLI。编辑器首次启动默认简体中文，保留完整英文入口，原生文件弹窗使用同一语言；用户保存过的语言选择继续优先。当前行为按用户可观察边界拆分为：

- [编辑器与尺寸链](editor.md)
- [工程文件](project-file.md)
- [型材 BOM](profile-bom.md)
- [工程检查](engineering-rules.md)
- [Headless CLI](headless-cli.md)

本目录只描述已经验证的行为。当前梁筛选不是完整结构分析；连接节点、完整订单 BOM、自定义目录与 live attach 仍在后续 changeset 中，不能从当前实现推断为可用。
