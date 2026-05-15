# 文件摆渡人

一个真正的文件粉碎桌面应用，使用 Electron 技术栈。

## 功能

- 彻底删除本地文件（无法恢复）
- 使用 DoD 5220.22-M 标准：覆写 3 次随机数据 + 1 次全零
- 支持拖拽文件或点击选择
- 显示文件原始路径

## 运行

```bash
cd file-shredder
npm install
npm start
```

## 打包

```bash
npm install electron-builder -D
npm run build
```

打包后的 exe 文件会生成在 `dist` 目录。

## 注意

- 粉碎后的文件无法恢复，请谨慎操作
- 文件会直接从磁盘彻底删除