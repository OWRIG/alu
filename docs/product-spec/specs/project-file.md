# 工程文件

## 当前行为

`.alu` 是 UTF-8、规范化排序的单一 JSON 文档。当前只接受 `ProjectDocumentV1`：`formatVersion` 必须为 1，顶层和嵌套对象使用严格 schema，数字必须有限，文件上限为 8 MiB。

工程保存 context、输入/派生参数、字段绑定、型材实体、实际引用的 definition snapshot 和可选 BOM snapshot。已知的 `extensions.structuralSizing` 另外保存版本化研究输入、候选 SKU 快照、厂家计算来源和可选现场构造证据；研究 scope、假设 ID 与接口体系是开放稳定 ID，接口过滤和构造证据均可为空。挠度和入选结果不缓存，打开后确定性重算。文件不包含脚本、可执行内容、视角状态或预览图。

Main 进程在目标目录写临时文件、flush、关闭后 rename；校验或写入失败不会用半份 JSON 覆盖最后一次成功内容。打开时重新计算 BOM，并在快照哈希漂移时提示“已重新计算”。

Renderer 只收到显示文件名、文件哈希和不含路径的最近工程 ID。任意路径、文件系统和 `ipcRenderer` 不暴露到页面。

## Cases

| Case                               | 已验证结果                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `C-save-reopen-roundtrip`          | 保存后重开保留稳定 ID、尺寸、参数、绑定和 definition snapshot              |
| `C-embedded-catalog-portability`   | 只依赖文件内嵌的精确 definition revision 即可解析与生成 BOM                |
| `C-import-schema-validation`       | 损坏 JSON、未知字段、超限内容或语义引用错误被拒绝并返回定位信息            |
| `C-import-unknown-version`         | `formatVersion` 高于 1 被拒绝，不做静默降级                                |
| `C-atomic-save`                    | 保存前校验失败时原文件字节保持不变；成功路径使用同目录临时文件替换         |
| `C-bom-snapshot-drift`             | 导入的 BOM 快照与重算不一致时标记漂移，设计实体保持不变                    |
| `C-structural-study-portable`      | 结构研究、候选快照和证据保存重开后保持一致，已知扩展的引用与梁数被语义校验 |
| `C-structural-study-open-evidence` | 空构造证据、自定义 scope、假设和接口体系可以保存重开                       |

## 安全配置

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webviewTag: false`
- 新窗口、外部导航和 webview 挂载全部拒绝
- preload 为 sandbox 可执行的最小 CJS bundle，只暴露 `getLaunch/open/openRecent/recent/save/saveAs`
- settings API 只增加 `setLocale`，不暴露通用配置或原始 IPC
- 每个 project/settings IPC handler 精确校验 `senderFrame.url` 是否为当前应用 renderer
- 发布包关闭 RunAsNode、NODE_OPTIONS 和 CLI inspect，并启用 ASAR 完整性与 only-load-from-ASAR

对应发布安全 case：`C-ipc-trusted-sender`、`C-electron-release-fuses`。
