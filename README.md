[中文文档](readme-zh.md)

# Obsidian Image Auto Upload Plugin

This plugin can help you to auto upload image by [picgo](https://github.com/Molunerfinn/PicGo) or [PicGo-Core](https://picgo.github.io/PicGo-Core-Doc/).

**You should restart obsidian after updating the plugin.**

# Start

1. install the [picgo](https://github.com/Molunerfinn/PicGo) and config it
2. open the tool and open the setting "设置 server"
3. install the plugin in obsidian
4. open the plugin setting, and set the "picGo server" http://127.0.0.1:{{port in picgo}}/upload（example：http://127.0.0.1:36677/upload）
5. try paste image

# Features

## Upload when paste image

When you paste image to obsidian, this plugin will auto upload you image.

You can set `image-auto-upload: false` in `frontmatter` to control one file.

support ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff"

Because of the [bug](https://github.com/renmu123/obsidian-image-auto-upload-plugin/issues/2) in PicGo 2.3.0-beta7, you can not use this feature. you can install other PicGo version.

```yaml
---
image-auto-upload: true
---
```

## Upload all local images file by command

press `ctrl+P` and input `upload all images`，enter, then will auto upload all local images

## download all internet to local

press `ctrl+P` and input `download all images`，enter, then will auto download all internet images to loacl.only test in win10

## Upload image by contextMenu

Now you can upload image by contextMenu in edit mode.
Now support standard md link, wiki link and absolute,relative.

## Support drag-and-drop

## Support picgo-core

You can install picgo-core with npm. Reference to [doc](https://picgo.github.io/PicGo-Core-Doc/)

# TODO

- [x] upload all local images file by command
- [x] support yaml to config if upload image
- [x] support picgo-core
- [x] support upload image from system copy selected image
- [x] support network image

# Thanks

[obsidian-imgur-plugin](https://github.com/gavvvr/obsidian-imgur-plugin)
![20211112170145](https://i.loli.net/2021/11/12/9XD1pMs2HZgGvj7.png)
