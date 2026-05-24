# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**智能素材分拣一体机** — 基于 AI 视觉识别的服装/面料智能分拣系统。使用 Capacitor 封装为 Android APK，前端为原生 HTML/CSS/JS 单页应用。

## 技术栈

- **前端**: 原生 HTML5 + CSS3 + JavaScript（无框架）
- **移动端**: Capacitor 8.x（Android）
- **AI**: SiliconFlow API（GLM-4.5V 视觉模型），用于识别服装种类、面料成分、拆解方案
- **CI**: GitHub Actions 自动构建 APK

## 项目结构

```
wardrobe-sorter/
├── www/                   # Web 应用源码（Capacitor webDir）
│   ├── index.html         # 主页面（摄像头、扫描、结果展示、手动输入、编辑弹窗）
│   ├── css/style.css      # 完整设计系统与样式
│   ├── js/app.js          # 应用逻辑（摄像头、API调用、UI渲染）
│   ├── js/data.js         # Mock 数据集（6种服装类型）
│   └── manifest.json      # PWA 配置
├── android/               # Android 原生项目（Capacitor 生成）
│   └── app/src/main/AndroidManifest.xml  # 权限: INTERNET, CAMERA, RECORD_AUDIO
├── css/                   # 旧版源码（www/css 的源文件）
├── js/                    # 旧版源码（www/js 的源文件）
├── img/                   # 图片资源
├── package.json           # 依赖: @capacitor/android, @capacitor/cli, @capacitor/core
├── capacitor.config.json  # appId: com.wardrobe.sorter, appName: 智能素材分拣一体机
└── .github/workflows/     # CI 构建配置
```

## 核心功能

1. **摄像头识别**: 调用设备后置摄像头捕获服装图像
2. **AI 分析**: 通过 SiliconFlow API（GLM-4.5V）返回 3 个候选识别结果
3. **结果展示**: 多候选 Tabs 切换，展示成衣种类、面料成分、拆解方案、库存分类
4. **手动输入**: 支持手动填写物料信息（无网络备用方案）
5. **相册选取**: 支持从相册选择图片识别

## 构建与开发

```bash
# 安装依赖
npm install

# 同步 Capacitor Android 项目
npx cap sync android

# 构建 Debug APK
cd android
./gradlew assembleDebug

# APK 输出路径: android/app/build/outputs/apk/debug/*.apk
```

## GitHub Actions CI

提交到 main/master 分支会自动触发 `build-apk.yml`，在 ubuntu-latest 上执行：
1. Node.js 22 + Java 21 环境
2. `npm install` + `npx cap sync android`
3. `./gradlew assembleDebug` 构建 APK
4. 上传 APK 到 Actions Artifacts

## 关键配置

- **API 端点**: `https://api.siliconflow.cn/v1/chat/completions`（`www/js/app.js:3`）
- **视觉模型**: `zai-org/GLM-4.5V`（`www/js/app.js:4`）
- **API Key**: 内联在 `www/js/app.js:5`（⚠️ 注意这不是安全做法，生产环境应通过后端代理）
- **扫描失败降级**: API 调用失败时自动使用 Mock 数据（`www/js/data.js`）
- **Camera 权限**: 通过 `AndroidManifest.xml` 声明，运行时通过 `navigator.mediaDevices.getUserMedia` 请求
