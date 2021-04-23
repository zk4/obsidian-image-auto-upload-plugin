# Obsidian Image Auto Upload Plugin

这是一个利用 PicGo 自动上传剪切版图片的工具

# 特性

# 开始

1. 安装 PicGo 工具，并进行配置，配置参考[官网](https://github.com/Molunerfinn/PicGo)
2. 开启 PicGo 的 Server 服务，并记住端口号
3. 安装插件
4. 打开插件配置项，设置为http://127.0.0.1:{{PicGo设置的端口号}}/upload（例如：http://127.0.0.1:36677/upload）
5. 接下来试试看能否上传成功

# TODO

- [x] 支持批量上传
- [ ] 支持 picgo-core
- [ ] 支持复制系统图片文件，需要软件支持，详细见 [How to get file path in clipboard?](https://forum.obsidian.md/t/how-to-get-file-path-in-clipboard/16480)
- [ ] 支持其他命令行上传
