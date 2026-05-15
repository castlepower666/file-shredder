# 文件摆渡人

一个有灵魂的文件粉碎桌面应用。每一个文件在消逝前，都会留下一封信。

## 功能特点

- **彻底删除**：DoD 5220.22-M 标准，覆写 3 次随机数据 + 1 次全零，无法恢复
- **AI 遗言**：每个文件在粉碎前，会读取内容生成一段专属的"告别信"，像信件一样展示
- **两种模式**：
  - 正常打开应用 → 点击选择文件 → 粉碎 → 显示信件
  - 把文件拖到 exe 图标上 → 自动粉碎 → 弹出信件窗口 → 关闭退出

## 运行

```bash
npm install
npm start
```

## 配置

首次使用需要配置 DeepSeek API：

1. 复制 `.env.example` 为 `.env`（或在应用窗口点击选择文件时配置）
2. 填入你的 API Key：

```
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat
```

API Key 获取地址：https://platform.deepseek.com/

## 打包

```bash
npm install electron-builder --save-dev
npm run build
```

打包后的 exe 在 `dist/win-unpacked/` 目录。

## 分发给朋友

1. 把 `dist/win-unpacked/` 整个文件夹发给别人
2. 朋友需要：
   - 在 `resources/app/` 目录下创建 `.env` 文件
   - 填入自己的 DeepSeek API Key
3. 运行 `file-ferryman.exe` 即可使用

## 技术栈

- Electron 42
- DeepSeek API（AI 生成告别信）
- DoD 5220.22-M 文件粉碎标准

## 使用方法

### 方式一：拖拽删除（推荐）

直接把文件拖到 `file-ferryman.exe` 图标上，程序会自动：
1. 执行粉碎（覆写 + 删除）
2. 调用 AI 生成告别信
3. 弹出信件窗口显示遗言
4. 点击"尘归尘"关闭

### 方式二：正常启动

1. 双击运行 `file-ferryman.exe`
2. 点击选择要粉碎的文件
3. 点击"粉碎文件"按钮
4. 查看 AI 生成的告别信
5. 点击"尘归尘"关闭

## 下载使用

每个 Release 版本都附带打包好的 exe 文件，下载后解压即可使用。

### 快速开始

1. 下载 `win-unpacked.7z` 或 `win-unpacked.zip`
2. 解压到任意目录
3. 进入 `resources/app` 目录，复制 `.env.example` 为 `.env`
4. 填入你的 DeepSeek API Key
5. 运行 `file-ferryman.exe`

## 注意

- 粉碎后的文件无法恢复，请谨慎操作
- AI 告别信的内容由 DeepSeek 生成，可能存在随机性
- API 使用会产生费用，请留意 DeepSeek 账单