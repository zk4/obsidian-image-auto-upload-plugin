import {
  App,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Setting,
  FileSystemAdapter,
  Editor,
} from "obsidian";

import fetch from "node-fetch";

import { resolve, extname } from "path";
import { existsSync } from "fs";

import { clipboard } from "electron";

const REGEX_IMAGE = /\!\[(.*?)\]\((.*?)\)/g;

interface PluginSettings {
  uploadServer: string;
}

interface Image {
  path: string;
  name: string;
  source: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
  uploadServer: "http://127.0.0.1:36677/upload",
};

interface PicGoResponse {
  success: string;
  msg: string;
}

export default class imageAutoUploadPlugin extends Plugin {
  settings: PluginSettings;
  readonly cmAndHandlersMap = new Map();

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    this.restoreOriginalHandlers();
  }

  restoreOriginalHandlers() {
    this.cmAndHandlersMap.forEach((originalHandler, cm) => {
      cm._handlers.paste[0] = originalHandler;
    });
  }

  async onload() {
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
  }

  isAssetTypeAnImage(path: string): Boolean {
    return (
      [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff"].indexOf(
        extname(path).toLowerCase()
      ) !== -1
    );
  }

  uploadAllFile() {
    let editor = this.getEditor();
    let key = editor.getValue();
    const matches = key.matchAll(REGEX_IMAGE);

    const thisPath = this.app.vault.getAbstractFileByPath(
      this.app.workspace.getActiveFile().path
    );
    const basePath = (this.app.vault
      .adapter as FileSystemAdapter).getBasePath();

    let imageList: Image[] = [];

    for (const match of matches) {
      const imageName = match[1];
      const encodedUri = match[2];
      if (!encodedUri.startsWith("http")) {
        const abstractImageFile = decodeURI(
          resolve(basePath, thisPath.parent.path, encodedUri)
        );
        if (
          existsSync(abstractImageFile) &&
          this.isAssetTypeAnImage(abstractImageFile)
        ) {
          imageList.push({
            path: abstractImageFile,
            name: imageName,
            source: match[0],
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

        this.getEditor().setValue(key);
      }
    });
  }

  setupPasteHandler() {
    this.registerCodeMirror((cm: any) => {
      let originalPasteHandler = this.backupOriginalPasteHandler(cm);

      cm._handlers.paste[0] = (_: any, e: ClipboardEvent) => {
        const allowUpload = this.getFrontmatterValue("image-auto-upload", true);

        if (allowUpload) {
          if (!this.settings.uploadServer) {
            console.warn("Please either set uploadServer");
            return originalPasteHandler(_, e);
          }
          let files = e.clipboardData.files;
          if (
            !this.isCopyImageFile() &&
            (files.length === 0 || !files[0].type.startsWith("image"))
          ) {
            return originalPasteHandler(_, e);
          } else {
            this.uploadFileAndEmbedImgurImage().catch(console.error);
          }
        } else {
          return originalPasteHandler(_, e);
        }
      };
    });
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

  async uploadFileAndEmbedImgurImage() {
    let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
    this.insertTemporaryText(pasteId);

    try {
      let resp = await this.uploadFileByClipboard();
      let data: PicGoResponse = await resp.json();

      if (!data.success) {
        let err = { response: data, body: data.msg };
        this.handleFailedUpload(pasteId, err);
        return;
      }
      this.embedMarkDownImage(pasteId, data);
    } catch (e) {
      this.handleFailedUpload(pasteId, e);
    }
  }

  insertTemporaryText(pasteId: string) {
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    this.getEditor().replaceSelection(progressText + "\n");
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

  embedMarkDownImage(pasteId: string, jsonResponse: any) {
    let imageUrl = jsonResponse.result[0];

    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    let markDownImage = `![](${imageUrl})`;

    imageAutoUploadPlugin.replaceFirstOccurrence(
      this.getEditor(),
      progressText,
      markDownImage
    );
  }

  handleFailedUpload(pasteId: string, reason: any) {
    console.error("Failed request: ", reason);
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    imageAutoUploadPlugin.replaceFirstOccurrence(
      this.getEditor(),
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
    return mdView.editor;
  }

  getFrontmatterValue(key: string, defaultValue: any = undefined) {
    const path = this.app.workspace.getActiveFile().path;
    const cache = this.app.metadataCache.getCache(path);

    let value = defaultValue;
    if (cache?.frontmatter && cache.frontmatter.hasOwnProperty(key)) {
      value = cache.frontmatter[key];
    }
    return value;
  }
}

class SettingTab extends PluginSettingTab {
  plugin: imageAutoUploadPlugin;

  constructor(app: App, plugin: imageAutoUploadPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();
    containerEl.createEl("h2", { text: "plugin settings" });
    new Setting(containerEl)
      .setName("picGo server")
      .setDesc("picGo server")
      .addText(text =>
        text
          .setPlaceholder("please input picGo server")
          .setValue(this.plugin.settings.uploadServer)
          .onChange(async key => {
            this.plugin.settings.uploadServer = key;
            await this.plugin.saveSettings();
          })
      );
  }
}
