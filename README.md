# 智能素材分拣一体机

基于 AI 视觉识别的服装/面料智能分拣系统。使用 Capacitor 封装为 Android APK，前端为原生 HTML/CSS/JS 单页应用。

## 功能特性

- **摄像头识别** — 调用设备后置摄像头捕获服装图像，AI 实时分析
- **AI 智能分析** — 通过 SiliconFlow API（GLM-4.5V）识别成衣种类、面料成分、拆解方案，支持 3 个候选结果切换
- **原图显示** — 识别结果中显示扫描原图，支持点击全屏查看
- **相册导入** — 支持从相册选择图片进行识别
- **扫描历史** — 自动保存扫描记录，支持查看、编辑、删除、清空
- **手动输入** — 快速手动录入物料信息
- **信息编辑** — 支持修改物料名称、成衣种类、面料成分、拆解方案、库存分类
- **前后摄像头切换** — 灵活适配不同拍摄场景

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML5 + CSS3 + JavaScript（无框架） |
| 移动端 | Capacitor 8.x（Android） |
| AI 视觉 | SiliconFlow API（GLM-4.5V） |
| 存储 | 浏览器 localStorage（持久化） |
| CI/CD | GitHub Actions 自动构建 APK |

## 项目结构

```
wardrobe-sorter/
├── www/                      # Web 应用源码（Capacitor webDir）
│   ├── index.html            # 主页面
│   ├── css/style.css         # 设计系统与样式
│   ├── js/app.js             # 应用核心逻辑
│   ├── js/data.js            # Mock 数据集
│   ├── img/                  # 应用图标
│   └── manifest.json         # PWA 配置
├── android/                  # Android 原生项目
├── img/                      # 图片资源
├── package.json              # 项目依赖
└── capacitor.config.json     # Capacitor 配置
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
cd www && python -m http.server 8080

# 浏览器访问
# http://localhost:8080
```

## 构建 APK

```bash
# 同步 Capacitor Android 项目
npx cap sync android

# 构建 Debug APK
cd android
./gradlew assembleDebug

# 输出路径
# android/app/build/outputs/apk/debug/*.apk
```

## 使用说明

1. 打开应用，授权相机权限
2. 将衣物置于扫描框内，点击中央拍照按钮
3. 等待 AI 分析完成，查看识别结果
4. 可在多个候选结果间切换，选择最匹配的项
5. 点击铅笔图标编辑物料信息
6. 点击顶部时钟图标查看扫描历史

## 配置

API 配置位于 `www/js/app.js`：

- **端点**: `https://api.siliconflow.cn/v1/chat/completions`
- **模型**: `zai-org/GLM-4.5V`
- **降级策略**: API 失败时自动使用 Mock 数据

## License

MIT
