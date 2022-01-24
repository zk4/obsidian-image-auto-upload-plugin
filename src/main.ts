import {
  MarkdownView,
  Plugin,
  FileSystemAdapter,
  Editor,
  Menu,
  MenuItem,
  TFile,
  normalizePath,
  Notice,
  addIcon,
} from "obsidian";

import { resolve, extname, relative, join, parse, posix } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";

import fetch from "node-fetch";
import { clipboard } from "electron";

import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";

const REGEX_FILE = /\!\[(.*?)\]\((.*?)\)/g;

interface Image {
  path: string;
  name: string;
  source: string;
}

interface PicGoResponse {
  success: string;
  msg: string;
}

export default class imageAutoUploadPlugin extends Plugin {
  settings: PluginSettings;
  readonly cmAndHandlersMap = new WeakMap();

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {}

  async onload() {
    addIcon(
      "upload",
      `<svg t="1636630783429" class="icon" viewBox="0 0 100 100" version="1.1" p-id="4649" xmlns="http://www.w3.org/2000/svg">
      <path d="M 71.638 35.336 L 79.408 35.336 C 83.7 35.336 87.178 38.662 87.178 42.765 L 87.178 84.864 C 87.178 88.969 83.7 92.295 79.408 92.295 L 17.249 92.295 C 12.957 92.295 9.479 88.969 9.479 84.864 L 9.479 42.765 C 9.479 38.662 12.957 35.336 17.249 35.336 L 25.019 35.336 L 25.019 42.765 L 17.249 42.765 L 17.249 84.864 L 79.408 84.864 L 79.408 42.765 L 71.638 42.765 L 71.638 35.336 Z M 49.014 10.179 L 67.326 27.688 L 61.835 32.942 L 52.849 24.352 L 52.849 59.731 L 45.078 59.731 L 45.078 24.455 L 36.194 32.947 L 30.702 27.692 L 49.012 10.181 Z" p-id="4650" fill="#8a8a8a"></path>
    </svg>`
    );
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.setupPasteHandler();
    this.addCommand({
      id: "upload all images",
      name: "upload all images",
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            this.uploadAllFile();
          }
          return true;
        }
        return false;
      },
    });
    this.addCommand({
      id: "doanload all images",
      name: "download all images",
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            this.downloadAllImageFiles();
          }
          return true;
        }
        return false;
      },
    });

    this.registerFileMenu();
  }
  ///TODO: asset路径处理（assets文件夹不存在处理），下载图片失败处理
  async downloadAllImageFiles() {
    const folderPath = this.getFileAssetPath();
    const fileArray = this.getAllFiles();
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath);
    }

    let imageArray = [];
    for (const file of fileArray) {
      if (!file.path.startsWith("http")) {
        continue;
      }

      const url = file.path;
      const asset = this.getUrlAsset(url);
      if (!this.isAnImage(asset.substr(asset.lastIndexOf(".")))) {
        continue;
      }
      let [name, ext] = [
        decodeURI(parse(asset).name).replaceAll(/[\\\\/:*?\"<>|]/g, "-"),
        parse(asset).ext,
      ];
      // 如果文件名已存在，则用随机值替换
      if (existsSync(join(folderPath, encodeURI(asset)))) {
        name = (Math.random() + 1).toString(36).substr(2, 5);
      }

      const response = await this.download(
        url,
        join(folderPath, `${name}${ext}`)
      );
      if (response.ok) {
        const activeFolder = this.app.vault.getAbstractFileByPath(
          this.app.workspace.getActiveFile().path
        ).parent.path;

        const basePath = (
          this.app.vault.adapter as FileSystemAdapter
        ).getBasePath();
        const abstractActiveFolder = resolve(basePath, activeFolder);

        imageArray.push({
          source: file.source,
          name: name,
          path: normalizePath(relative(abstractActiveFolder, response.path)),
        });
      }
    }

    let editor = this.getEditor();
    let value = editor.getValue();
    imageArray.map(image => {
      value = value.replace(image.source, `![${image.name}](${image.path})`);
    });

    this.setValue(value);

    new Notice(
      `all: ${fileArray.length}\nsuccess: ${imageArray.length}\nfailed: ${
        fileArray.length - imageArray.length
      }`
    );
  }

  // 获取当前文件所属的附件文件夹
  getFileAssetPath() {
    const basePath = (
      this.app.vault.adapter as FileSystemAdapter
    ).getBasePath();

    // @ts-ignore
    const assetFolder: string = this.app.vault.config.attachmentFolderPath;
    const activeFile = this.app.vault.getAbstractFileByPath(
      this.app.workspace.getActiveFile().path
    );

    // 当前文件夹下的子文件夹
    if (assetFolder.startsWith("./")) {
      const activeFolder = decodeURI(resolve(basePath, activeFile.parent.path));
      return join(activeFolder, assetFolder);
    } else {
      // 根文件夹
      return join(basePath, assetFolder);
    }
  }

  async download(url: string, path: string) {
    const response = await fetch(url);
    if (response.status !== 200) {
      return {
        ok: false,
        msg: response.statusText,
      };
    }
    const buffer = await response.buffer();
    try {
      writeFileSync(path, buffer);
      return {
        ok: true,
        msg: "ok",
        path: path,
      };
    } catch (err) {
      return {
        ok: false,
        msg: err,
      };
    }
  }

  getUrlAsset(url: string) {
    return (url = url.substr(1 + url.lastIndexOf("/")).split("?")[0]).split(
      "#"
    )[0];
  }

  registerFileMenu() {
    this.app.workspace.on(
      "file-menu",
      (menu: Menu, file: TFile, source: string) => {
        if (!this.isAssetTypeAnImage(file.path)) {
          return false;
        }
        menu.addItem((item: MenuItem) => {
          item
            .setTitle("Upload")
            .setIcon("upload")
            .onClick(() => {
              if (!(file instanceof TFile)) {
                return false;
              }

              const basePath = (
                this.app.vault.adapter as FileSystemAdapter
              ).getBasePath();

              const uri = decodeURI(resolve(basePath, file.path));
              const editor = this.getEditor();
              this.uploadFiles([uri]).then(res => {
                if (res.success) {
                  let uploadUrl = [...res.result][0];

                  let value = editor
                    .getValue()
                    .replaceAll(
                      encodeURI(
                        relative(
                          this.app.workspace.getActiveFile().parent.path,
                          file.path
                        ).replaceAll("\\", "/")
                      ),
                      uploadUrl
                    );
                  this.setValue(value);
                }
              });
            });
        });
      }
    );
  }

  setValue(value: string) {
    const editor = this.getEditor();
    const { left, top } = editor.getScrollInfo();

    editor.setValue(value);
    editor.scrollTo(left, top);
  }
  uploadFile() {}

  isAnImage(ext: string) {
    return [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff"].includes(
      ext.toLowerCase()
    );
  }
  isAssetTypeAnImage(path: string): Boolean {
    return (
      [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff"].indexOf(
        extname(path).toLowerCase()
      ) !== -1
    );
  }
  // get all file urls, include local and internet
  getAllFiles(): Image[] {
    let editor = this.getEditor();
    let key = editor.getValue();
    const matches = key.matchAll(REGEX_FILE);

    let fileArray: Image[] = [];

    for (const match of matches) {
      const name = match[1];
      const path = match[2];
      const source = match[0];

      fileArray.push({
        path: path,
        name: name,
        source: source,
      });
    }
    return fileArray;
  }

  // uploda all file
  uploadAllFile() {
    let editor = this.getEditor();
    if (!editor) {
      return false;
    }

    let key = editor.getValue();

    const thisPath = this.app.vault.getAbstractFileByPath(
      this.app.workspace.getActiveFile().path
    );
    const basePath = (
      this.app.vault.adapter as FileSystemAdapter
    ).getBasePath();

    let imageList: Image[] = [];
    const fileArray = this.getAllFiles();

    for (const match of fileArray) {
      const imageName = match.name;
      const encodedUri = match.path;
      if (!encodedUri.startsWith("http")) {
        const abstractImageFile = decodeURI(
          join(
            basePath,
            posix.resolve(posix.join("/", thisPath.parent.path), encodedUri)
          )
        );
        if (
          existsSync(abstractImageFile) &&
          this.isAssetTypeAnImage(abstractImageFile)
        ) {
          imageList.push({
            path: abstractImageFile,
            name: imageName,
            source: match.source,
          });
        }
      }
    }

    this.uploadFiles(imageList.map(item => item.path)).then(res => {
      if (res.success) {
        let uploadUrlList = [...res.result];
        imageList.map(item => {
          // gitea不能上传超过1M的数据，上传多张照片，错误的话会返回什么？还有待验证
          const uploadImage = uploadUrlList.shift();
          key = key.replaceAll(item.source, `![${item.name}](${uploadImage})`);
        });
        this.setValue(key);
      }
    });
  }

  setupPasteHandler() {
    this.app.workspace.on(
      "editor-paste",
      (evt: ClipboardEvent, editor: Editor, markdownView: MarkdownView) => {
        const allowUpload = this.getFrontmatterValue(
          "image-auto-upload",
          this.settings.uploadByClipSwitch
        );

        let files = evt.clipboardData.files;
        if (
          allowUpload &&
          (this.isCopyImageFile() ||
            files.length !== 0 ||
            files[0].type.startsWith("image"))
        ) {
          this.uploadFileAndEmbedImgurImage(editor).catch(console.error);
          evt.preventDefault();
        }
      }
    );
    this.app.workspace.on(
      "editor-drop",
      async (evt: DragEvent, editor: Editor, markdownView: MarkdownView) => {
        const allowUpload = this.getFrontmatterValue(
          "image-auto-upload",
          this.settings.uploadByClipSwitch
        );
        if (allowUpload) {
          let files = evt.dataTransfer.files;
          if (files.length !== 0 && files[0].type.startsWith("image")) {
            let sendFiles: Array<String> = [];
            let files = evt.dataTransfer.files;
            Array.from(files).forEach((item, index) => {
              sendFiles.push(item.path);
            });
            evt.preventDefault();

            const data = await this.uploadFiles(sendFiles);

            if (data.success) {
              data.result.map((value: string) => {
                let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
                this.insertTemporaryText(editor, pasteId);
                this.embedMarkDownImage(editor, pasteId, value);
              });
            } else {
              new Notice("Upload error");
            }
          }
        }
      }
    );
  }

  isCopyImageFile() {
    let filePath = "";
    const os = this.getOS();

    if (os === "Windows") {
      var rawFilePath = clipboard.read("FileNameW");
      filePath = rawFilePath.replace(
        new RegExp(String.fromCharCode(0), "g"),
        ""
      );
    } else if (os === "MacOS") {
      filePath = clipboard.read("public.file-url").replace("file://", "");
    } else {
      filePath = "";
    }
    return this.isAssetTypeAnImage(filePath);
  }

  getOS() {
    const { appVersion } = navigator;
    if (appVersion.indexOf("Win") !== -1) {
      return "Windows";
    } else if (appVersion.indexOf("Mac") !== -1) {
      return "MacOS";
    } else if (appVersion.indexOf("X11") !== -1) {
      return "Linux";
    } else {
      return "Unknown OS";
    }
  }

  backupOriginalPasteHandler(cm: any) {
    if (!this.cmAndHandlersMap.has(cm)) {
      let originalHandler = cm._handlers.paste[0];
      this.cmAndHandlersMap.set(cm, originalHandler);
    }
    return this.cmAndHandlersMap.get(cm);
  }

  async uploadFileAndEmbedImgurImage(editor: Editor) {
    let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
    this.insertTemporaryText(editor, pasteId);

    try {
      let resp = await this.uploadFileByClipboard();
      let data: PicGoResponse = await resp.json();

      if (!data.success) {
        let err = { response: data, body: data.msg };
        this.handleFailedUpload(editor, pasteId, err);
        return;
      }
      this.embedMarkDownImage(editor, pasteId, data.result[0]);
    } catch (e) {
      this.handleFailedUpload(editor, pasteId, e);
    }
  }

  insertTemporaryText(editor: Editor, pasteId: string) {
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    editor.replaceSelection(progressText + "\n");
  }

  private static progressTextFor(id: string) {
    return `![Uploading file...${id}]()`;
  }

  async uploadFiles(fileList: Array<String>): Promise<any> {
    const response = await fetch(this.settings.uploadServer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list: fileList }),
    });
    const data = await response.json();
    return data;
  }

  uploadFileByClipboard(): Promise<any> {
    return fetch(this.settings.uploadServer, {
      method: "POST",
    });
  }

  embedMarkDownImage(editor: Editor, pasteId: string, imageUrl: any) {
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    let markDownImage = `![](${imageUrl})`;

    imageAutoUploadPlugin.replaceFirstOccurrence(
      editor,
      progressText,
      markDownImage
    );
  }

  handleFailedUpload(editor: Editor, pasteId: string, reason: any) {
    console.error("Failed request: ", reason);
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    imageAutoUploadPlugin.replaceFirstOccurrence(
      editor,
      progressText,
      "⚠️upload failed, check dev console"
    );
  }

  static replaceFirstOccurrence(
    editor: Editor,
    target: string,
    replacement: string
  ) {
    let lines = editor.getValue().split("\n");
    for (let i = 0; i < lines.length; i++) {
      let ch = lines[i].indexOf(target);
      if (ch != -1) {
        let from = { line: i, ch: ch };
        let to = { line: i, ch: ch + target.length };
        editor.replaceRange(replacement, from, to);
        break;
      }
    }
  }

  getEditor() {
    const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (mdView) {
      return mdView.editor;
    } else {
      return null;
    }
  }

  getFrontmatterValue(key: string, defaultValue: any = undefined) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      return undefined;
    }
    const path = file.path;
    const cache = this.app.metadataCache.getCache(path);

    let value = defaultValue;
    if (cache?.frontmatter && cache.frontmatter.hasOwnProperty(key)) {
      value = cache.frontmatter[key];
    }
    return value;
  }
}
