# Emdash Classic

Emdash Classic 是一款开源桌面应用，可在本机的独立 Git 工作树中并行运行 Claude Code、Codex、OpenCode 等编程智能体，支持 macOS、Windows 和 Linux。

<div align="center">

[上游下载](https://emdash.com/download) · [上游文档](https://emdash.com/docs) · [上游发行版](https://github.com/generalaction/emdash/releases/latest) · [Discord](https://discord.gg/f2fv7YxuR2) · [参与贡献](CONTRIBUTING.md)

<br />

[![Apache 2.0 许可证](https://img.shields.io/badge/License-Apache_2.0-555555.svg?labelColor=333333&color=666666)](./LICENSE.md)
[![上游下载次数](https://img.shields.io/github/downloads/generalaction/emdash/total?labelColor=333333&color=666666)](https://github.com/generalaction/emdash/releases)
[![上游 GitHub 星标](https://img.shields.io/github/stars/generalaction/emdash?labelColor=333333&color=666666&logo=github)](https://github.com/generalaction/emdash)
[![上游最近一次提交](https://img.shields.io/github/last-commit/generalaction/emdash?labelColor=333333&color=666666)](https://github.com/generalaction/emdash/commits/main)
[![上游提交活跃度](https://img.shields.io/github/commit-activity/m/generalaction/emdash?labelColor=333333&color=666666)](https://github.com/generalaction/emdash/graphs/commit-activity)

[![Discord](https://img.shields.io/badge/Discord-join-%235462eb?labelColor=%235462eb&logo=discord&logoColor=%23f5f5f5)](https://discord.gg/f2fv7YxuR2)
<a href="https://www.ycombinator.com"><img src="https://img.shields.io/badge/Y%20Combinator-W26-orange" alt="Y Combinator W26"></a>
[![在 X 上关注 @emdashcom](https://img.shields.io/twitter/follow/emdashcom?logo=X&color=%23f5f5f5)](https://twitter.com/intent/follow?screen_name=emdashcom)

</div>

<img alt="上游 Emdash Classic 界面截图" src="https://emdash.com/media/blog/public-v1-beta/v1beta.jpg" />

## 当前分支的功能

- 无需 Emdash 账号即可打开本地项目、通过 URL 克隆仓库，以及查看和提交 Git 改动。应用内登录与依赖账号的议题和拉取请求集成已移除。
- 在独立的 Git 工作树和分支中并行运行多个智能体，可直接在应用内管理任务和终端。
- 开发任务、工作区和应用预览均在本机运行。SSH 远程开发与端口转发已移除。已有的 SSH 项目会显示为不可用，可手动移除本机记录。
- 首页、菜单、项目、任务、设置、编辑器、终端和聊天的主要界面采用简体中文。

## 安装

### 从源码构建当前分支

检出 `main2` 后，在仓库根目录运行以下命令。Linux 安装包生成在 `apps/emdash-desktop/release/`。

```bash
pnpm install
pnpm exec nx build @emdash/emdash-desktop
pnpm --dir apps/emdash-desktop run package:linux
```

### 上游安装包

下表列出上游 Emdash 的下载和安装方式。

| 平台 | 安装方式 |
| --- | --- |
| macOS | `brew install --cask emdash` · [Apple Silicon](https://github.com/generalaction/emdash/releases/latest/download/emdash-arm64.dmg) · [Intel](https://github.com/generalaction/emdash/releases/latest/download/emdash-x64.dmg) |
| Windows | [安装版](https://github.com/generalaction/emdash/releases/latest/download/emdash-x64.msi) · [便携版](https://github.com/generalaction/emdash/releases/latest/download/emdash-x64.exe) |
| Linux x64 | [AppImage](https://github.com/generalaction/emdash/releases/latest/download/emdash-x86_64.AppImage) · [DEB](https://github.com/generalaction/emdash/releases/latest/download/emdash-amd64.deb) · [RPM](https://github.com/generalaction/emdash/releases/latest/download/emdash-x86_64.rpm) |
| Linux ARM64 | [AppImage](https://github.com/generalaction/emdash/releases/latest/download/emdash-arm64.AppImage) · [DEB](https://github.com/generalaction/emdash/releases/latest/download/emdash-arm64.deb) · [RPM](https://github.com/generalaction/emdash/releases/latest/download/emdash-aarch64.rpm) |

所有上游桌面安装包见 [最新发行版](https://github.com/generalaction/emdash/releases/latest)。

## 智能体

应用会检测本机已安装的智能体命令行工具，并沿用现有配置。若服务商要求认证，请通过对应的命令行工具完成配置。

对于支持生命周期钩子的智能体，应用会在其用户配置中添加带标记的条目。这些钩子用于跟踪状态、发送通知和恢复会话，只在应用启动的会话中生效。

完整的服务商列表、配置命令和各服务商的行为说明见 [服务商文档](https://emdash.com/docs/providers)。

## 隐私

应用采用本地优先方式，将应用状态保存在本机的 SQLite 数据库中。代码和聊天内容不会发送到 Emdash 服务器。

智能体命令行工具可能会将代码、提示和上下文发送给各自的服务商。数据处理方式取决于所选的服务商。

可在设置中关闭遥测，也可在启动应用时设置以下环境变量。

```bash
TELEMETRY_ENABLED=false
```

详情见 [遥测说明](https://emdash.com/docs/telemetry)。

## 参与贡献

欢迎参与贡献。你可以提交议题、阅读 [贡献指南](CONTRIBUTING.md) 或加入 [Discord 社区](https://discord.gg/f2fv7YxuR2)。

## 许可证

本项目采用 [Apache-2.0 许可证](LICENSE.md)。

上游 Emdash 的团队版、自托管和云端方案见 [Emdash 官网](https://emdash.com)。
