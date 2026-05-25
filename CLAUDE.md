# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**仓库分拣扫码机** — 基于 AI 视觉识别的仓库分拣系统。用于生产剩余物料的分拣归类。使用 Capacitor 封装为 Android APK，前端为原生 HTML/CSS/JS 单页应用。

## 技术栈

- **前端**: 原生 HTML5 + CSS3 + JavaScript（无框架）
- **移动端**: Capacitor 8.x（Android）
- **AI**: SiliconFlow API（GLM-4.5V 视觉模型），用于识别物料的材质、分区、货架
- **CI**: GitHub Actions 自动构建 APK

## 项目结构

```
wardrobe-sorter/
├── www/                   # Web 应用源码（Capacitor webDir）
│   ├── index.html         # 主页面（摄像头、扫描、结果展示、手动输入、编辑弹窗）
│   ├── css/style.css      # 完整设计系统与样式
│   ├── js/app.js          # 应用逻辑（摄像头、API调用、UI渲染）
│   ├── js/data.js         # Mock 数据集（6种仓库物料）
│   └── manifest.json      # PWA 配置
├── android/               # Android 原生项目（Capacitor 生成）
│   └── app/src/main/AndroidManifest.xml  # 权限: INTERNET, CAMERA, RECORD_AUDIO
├── package.json           # 依赖: @capacitor/android, @capacitor/cli, @capacitor/core
├── capacitor.config.json  # appId: com.wardrobe.sorter, appName: 仓库分拣扫码机
└── .github/workflows/     # CI 构建配置
```

## 核心功能

1. **摄像头扫码**: 调用设备后置摄像头捕获物料图像
2. **AI 分拣建议**: 通过 SiliconFlow API（GLM-4.5V）识别物料并建议存放分区和货架
3. **结果展示**: 多候选 Tabs 切换，展示物料名、材质、分区、货架、分类、操作提示
4. **手动输入**: 支持手动填写物料信息（无网络备用方案）
5. **相册选取**: 支持从相册选择图片识别

## 仓库分区规则

- **A区**: 辅料类（纽扣、拉链、织唛、花边、松紧带等小件辅料）
- **B区**: 五金/配件类（金属件、扣具、钩环、装饰链等）
- **C区**: 面料/布艺类（布料、蕾丝、网纱、里衬等柔软物料）
- **D区**: 包材/杂项类（包装袋、纸卡、吊牌、填充棉等）

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

- **API 端点**: `https://api.siliconflow.cn/v1/chat/completions`（`www/js/app.js:2`）
- **视觉模型**: `zai-org/GLM-4.5V`（`www/js/app.js:3`）
- **API Key**: 内联在 `www/js/app.js:4`
- **扫描失败降级**: API 调用失败时自动使用 Mock 数据（`www/js/data.js`）
- **Camera 权限**: 通过 `AndroidManifest.xml` 声明，运行时通过 `navigator.mediaDevices.getUserMedia` 请求
