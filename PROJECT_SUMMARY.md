# 文件摆渡人 - 项目总结

## 项目起源

用户想要一个"像素烟灰缸"的小项目，我帮他创建了 `pixel-ashtray` 文件夹，实现了一个纯前端的像素风解压玩具。

后来用户想要一个"文件摆渡人"项目，需求是：一只可爱的像素小恐龙机器人站在左下角，文件拖进去会被"摆渡"（彻底删除）。

## 技术演进过程

### 第一阶段：纯网页版 (file-shredder-sprite)
- 纯 HTML/CSS/JS 实现
- 用户拖拽文件 → 前端假装粉碎 → 小恐龙跳舞
- **问题**：网页无法删除本地文件，只是心理安慰

### 第二阶段：Node.js 网页版 (file-shredder)
- 用 Node.js 搭建服务器，前端通过 HTTP 上传文件
- 服务端执行粉碎操作
- **问题**：用户需要手动把文件复制到 uploads 目录，原文件还是在桌面上

### 第三阶段：Electron 桌面应用
- 用 Electron 实现真正的桌面应用
- 可直接访问本地文件系统
- 支持点击选择文件粉碎
- **限制**：Electron 42+ 为了安全禁用了拖拽到网页的功能

### 第四阶段：支持拖拽到 exe 图标
- 当文件被拖到 exe 图标上时，Windows 会把文件路径作为命令行参数传入
- 程序检测到命令行参数，直接执行粉碎，然后显示结果，3秒后退出

### 第五阶段：AI 遗言功能
- 引入 DeepSeek API
- 粉碎文件前读取前 8KB 内容
- AI 根据文件名和内容生成"遗言"，像一封信一样显示在弹窗中
- 用户可以选择不同的 AI 模型

## 核心功能

1. **DoD 5220.22-M 粉碎标准**
   - 覆写 3 次随机数据
   - 再覆写 1 次全零
   - 最后删除文件

2. **两种使用方式**
   - 正常打开应用 → 点击选择文件 → 粉碎 → 显示 AI 遗言
   - 把文件拖到 exe 图标上 → 自动粉碎 → 3秒退出

3. **AI 遗言（文件摆渡人的灵魂）**
   - 读取文件前 8KB 内容发送给 DeepSeek
   - 生成拟人化的遗言，像信件一样展示
   - 支持自定义 AI 模型

## 技术栈

- **框架**：Electron 42
- **语言**：JavaScript (Node.js API)
- **前端**：HTML + CSS + Vanilla JS
- **AI**：DeepSeek API (可配置模型)
- **安全**：contextIsolation + preload 隔离

## 文件结构

```
file-ferryman/
├── main.js        # Electron 主进程，处理文件粉碎逻辑
├── preload.js     # 安全桥接前后端
├── index.html     # 界面
├── package.json   # 项目配置
├── .env           # API 配置（不上传）
├── .gitignore     # Git 忽略配置
└── README.md      # 项目说明
```

## 依赖安装与运行

```bash
cd file-ferryman
npm install
# 配置 DeepSeek API Key
# 编辑 .env 文件，设置 DEEPSEEK_API_KEY
npm start
```

## 环境变量配置

在 `.env` 文件中配置：

```
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat
```

## 待解决的问题

1. 拖拽到应用窗口内（网页区域）不可用
   - 原因：Electron 42 禁用了 File.path
   - 解决方式：把文件拖到 exe 图标上（命令行参数方式）

2. 如果需要打包成 exe 分发：
```bash
npm install electron-builder --save-dev
npm run build
```

## 项目参与者

- 想法来源：用户
- 实现：Claude Code

---

*创建于 2026-05-14*