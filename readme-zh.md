# Obsidian Image Auto Upload Plugin

这是一个利用 PicGo 自动上传剪切版图片的工具
**更新插件后记得重启一下 Obsidian**

# 开始

1. 安装 PicGo 工具，并进行配置，配置参考[官网](https://github.com/Molunerfinn/PicGo)
2. 开启 PicGo 的 Server 服务，并记住端口号
3. 安装插件
4. 打开插件配置项，设置为http://127.0.0.1:{{PicGo设置的端口号}}/upload（例如：http://127.0.0.1:36677/upload）
5. 接下来试试看能否上传成功

# 特性

## 剪切板上传

支持黏贴剪切板的图片的时候直接上传，目前支持复制系统内图像直接上传。
支持通过设置 `frontmatter` 来控制单个文件的上传，默认值为 `true`，控制关闭请将该值设置为 `false`

支持 ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff"

该功能在 PicGo 2.3.0-beta7 版本中无法使用，请更换其他版本

```yaml
---
image-auto-upload: true
---
```

## 批量上传一个文件中的所有图像文件

输入 `ctrl+P` 呼出面板，输入 `upload all images`，点击回车，就会自动开始上传。

## 批量下载网络图片到本地

输入 `ctrl+P` 呼出面板，输入 `download all images`，点击回车，就会自动开始下载。只在 win 进行测试

## 支持右键菜单上传图片

## 支持拖拽上传

# TODO

- [x] 支持批量上传
- [x] 支持 yaml 设置是否开启已达到单个文档的控制
- [ ] 支持 picgo-core
- [x] 支持复制系统图片文件
