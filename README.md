# @king3/file-kit

> FileKit — 多功能文件工具箱（Base64 转换 · 视频转音频 · 压缩/解压）

## 核心功能

- 📄 Base64 转换：文件 ↔ Base64 JSON，支持还原恢复。
- 🎵 视频 → 音频：支持多种格式，从视频文件提取音频 (mp3 / m4a / flac / wav …)。
- 🗜️ 文件压缩 / 解压：基于 fflate 提供高性能压缩、解压缩。

## 全局安装

```bash
npm install @king3/file-kit -g
```

## 使用示例

```bash
# 显示帮助
fkt --help

# 将文件转为 Base64 JSON
fkt base64 file.txt

# 将 Base64 JSON 恢复为原文件
fkt restore archive.json

# 从视频提取音频 (示例：mp3 高质量)
fkt v2a video.mp4 -o video.mp3 -f mp3 -q high

# 压缩文件夹 / 文件为 zip
fkt compress ./my-folder -o archive.zip

# 解压 zip 文件
fkt decompress archive.zip -o ./my-folder

# 启动交互模式
fkt -i
```

## 📊 架构分层说明

```
┌─────────────────────────────────────┐
│         CLI 层 (cli.ts)            │  ← Citty 命令行解析
├─────────────────────────────────────┤
│      Commands 层 (commands/)        │  ← 命令处理 + Clack 交互
├─────────────────────────────────────┤
│        Core 层 (core/)              │  ← 核心业务逻辑
├─────────────────────────────────────┤
│       Utils 层 (utils/)             │  ← 通用工具函数
└─────────────────────────────────────┘
```
