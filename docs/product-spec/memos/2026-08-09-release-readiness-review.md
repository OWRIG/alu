# 发布前优化复审

- 日期：2026-08-09
- 范围：Electron 安全、运行时体积、原生 i18n、打包、文档与 Agent Skill

## 结论

现有领域内核、三栏交互和 3D 渲染不需要发布前重构。渲染 bundle 约 2.9 MB 原始体积、约 0.55 MB gzip，本地 Electron 没有网络传输瓶颈；此时拆 chunk 会增加复杂度而不改善关键路径。

真正阻止发布的是四个窄缺口：Main 原生弹窗语言不同步、IPC 未验证发送页面、生产依赖会装入无用 renderer 包、没有可重复的安装包与内容回归。

## 决策

1. 语言仍由 renderer 的 typed dictionary 管理，只增加一个 `setLocale` IPC 让 Main 选择原生文案，不引入 i18n 框架。
2. Main 启动时计算唯一 renderer URL；所有 invoke handler 在解析数据前精确匹配 `senderFrame.url`。
3. React、Three、Zustand 和图标库移到 devDependencies。它们已打进 renderer 静态 bundle，生产 ASAR 只需 `@electron-toolkit/utils` 与 Zod。
4. 用 electron-builder 的单份 YAML 配置 macOS arm64；fuses 随打包注入，不在运行时维护第二套安全开关。
5. 截图由 Playwright 启动真实应用生成；README 不使用手工 mockup 冒充产品状态。
6. Skill 只描述桌面 UI 已有能力。P4 headless CLI 仍是未批准草案，不提前写入工具契约。
7. 生产依赖审计发现 Electron 40.10.6 命中高危 `GHSA-9f4c-93c8-jc8g`，发布基线升级到当前稳定 43.3.0，并要求升级后重跑源码与打包应用闭环。
8. 安装包压缩使用 `normal`。Electron runtime 多数资源已压缩，`maximum` 显著拖慢本地发布，不作为安全或正确性条件。
9. 开发 CSP 保留 Vite HMR 的 loopback WebSocket；生产构建移除这些来源，内容回归直接读取 ASAR 内 HTML 断言。

## 延后

- 不为本地 renderer 做路由级拆包；出现可测首屏或内存问题再处理。
- 不在 alpha 前升级所有“outdated”依赖；当前依赖组合已通过完整测试，批量升级只扩大回归面。
- 不把 GitHub Release、Apple notarization、Windows 构建和自动更新揉成一套 CI；先验证本机可复现的 arm64 产物。
