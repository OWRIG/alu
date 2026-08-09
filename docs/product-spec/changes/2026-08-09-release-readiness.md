# release-readiness

> 状态：已实现，已验证。

## Why

编辑器主闭环已经可用，但还不能直接发布：renderer 切换英文后，Main 原生弹窗仍固定中文；IPC 只校验数据、不校验发送页面；仓库没有安装包、发布内容回归、使用 Skill 和可复现的图文示例。

## Delta

### CHANGED `desktop.native-locale`

- `zh-CN` / `en-US` 选择通过受限 settings IPC 同步到 Main。
- 打开、保存、未保存关闭提醒和最近文件错误使用当前界面语言。
- 产品窗口标题统一为 `ALU`；文件名、稳定 ID、单位和用户内容仍保持原样。

### CHANGED `desktop.ipc-origin`

- 每个 project/settings handler 在处理输入前精确匹配受信 renderer 文档 URL。
- preload 仍不暴露原始 `ipcRenderer`、文件路径或 shell。
- 默认 session 拒绝全部权限请求；当前编辑器没有任何需要系统权限的功能。

### ADDED `distribution.macos-arm64`

- electron-builder 生成 Apple Silicon `.app`、DMG 和 ZIP；应用内容使用 ASAR，只装入 Main 实际需要的运行时依赖。
- 启用 hardened runtime 与 Electron fuses，关闭 RunAsNode、NODE_OPTIONS、CLI inspect 和 file 协议额外权限，并要求从带完整性校验的 ASAR 加载。
- 生产 renderer 由只映射 ASAR 内 `dist/renderer` 的 `alu://app` 安全协议提供，不再从高权限 `file://` 加载。
- 发布回归检查可执行文件、ASAR、语言包白名单和体积上限；关键 E2E 可直接对打包后的 `.app` 运行。

### ADDED `distribution.docs-and-skill`

- README 提供安装、五分钟路径、边界、验证和打包命令。
- 图文样例覆盖平嵌桌板尺寸链、切料和检查；截图从真实应用可重复生成。
- `design-with-alu` Skill 编排当前桌面 UI，明确不手改 `.alu`，也不把型材清单冒充可下单 BOM。

## Not in this change

- Windows/x64/universal 安装包、自动更新和崩溃上报。
- Apple 公证凭据托管或 CI 发布流水线。
- headless CLI、MCP、`.alu` 外部修改检测或 live attach。
- 连接件、加工、脚轮、桌板和附件的完整采购 BOM。

## Cases

- `C-native-dialog-locale` 切换英文后，Main 原生打开、保存与未保存提醒使用英文；切回中文后恢复中文。
- `C-ipc-trusted-sender` project/settings IPC 只接受已配置 renderer 文档，其他 file/remote URL 被拒绝。
- `C-electron-release-fuses` 打包应用关闭 RunAsNode、NODE_OPTIONS、CLI inspect 与 file 协议额外权限，并启用 ASAR 完整性和 only-load-from-ASAR。
- `C-macos-package-contents` arm64 应用包含可执行文件与单一 ASAR，只保留 `en-US` / `zh-CN` Electron 语言包且不产生 unpacked 目录。
- `C-packaged-app-smoke` 打包后的 `.app` 完成中英文切换、参数更新、BOM、保存与命令行重开闭环。
- `C-distribution-doc-example` README 与图文样例中的 2,200 mm 输入可复现 2,330 mm 外宽和 2,246 × 416 × 18 mm 平嵌板。
- `C-desktop-skill-valid` Skill 元数据通过官方 validator，工作流只使用当前桌面能力并写明安全边界。

## Verification

- `pnpm audit --prod --registry=https://registry.npmjs.org/`：Electron 升到 43.3.0 后无已知漏洞。
- `pnpm ready`：类型、lint、格式、边界、69 条唯一产品 case、15 个测试文件 / 42 项测试和生产构建通过。
- `pnpm test:e2e`：真实 Electron 完成中英文切换、参数/BOM、错误回滚、保存与重开。
- Skill 官方 validator：`design-with-alu` 元数据和目录结构有效。
- `pnpm docs:screenshots`：从真实应用重复生成中英文、切料与检查截图。
- `pnpm package:verify`：arm64 `.app` 的 ASAR 为 7.1 MiB，只含允许的构建/运行时根目录；生产 CSP、两种 locale 与全部 9 个 fuse 状态符合配置。
- `pnpm test:package`：通过 loopback CDP 驱动签名后的真实二进制，完成启动、i18n、参数、BOM、保存、命令行重开。
- `codesign --verify --deep --strict`：Developer ID 签名、hardened runtime 和 sealed resources 有效。
- `hdiutil verify`：DMG checksum 有效。
- `spctl --assess`：明确返回 `Unnotarized Developer ID`；当前没有 Apple 公证凭据，因此只作为 prerelease 发布并在 Release 中提示。

## Docs impact

同步 README、图文样例、当前产品行为、架构、测试策略、实施计划、路线图与发布说明。
