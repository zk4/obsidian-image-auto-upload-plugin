import fetch from "node-fetch";
import { clipboard } from "electron";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import {
  isAssetTypeAnImage,
  isAnImage,
  streamToString,
  getUrlAsset,
  isCopyImageFile,
  getLastImage,
} from "./utils";
import { execSync, exec } from "child_process";
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

interface PicGoResponse {
  success: string;
  msg: string;
  result: string[];
}

export class PicGoUploader {
  settings: PluginSettings;

  constructor(settings: PluginSettings) {
    this.settings = settings;
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

  async uploadFileByClipboard(): Promise<any> {
    const res = await fetch(this.settings.uploadServer, {
      method: "POST",
    });
    let data: PicGoResponse = await res.json();

    if (!data.success) {
      let err = { response: data, body: data.msg };
      return {
        code: -1,
        msg: data.msg,
        data: "",
      };
    } else {
      return {
        code: 0,
        msg: "success",
        data: data.result[0],
      };
    }
  }
}

export class PicGoCoreUploader {
  settings: PluginSettings;

  constructor(settings: PluginSettings) {
    this.settings = settings;
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

  async uploadFileByClipboard(): Promise<any> {
    const res = await fetch(this.settings.uploadServer, {
      method: "POST",
    });
    let data: PicGoResponse = await res.json();

    if (!data.success) {
      let err = { response: data, body: data.msg };
      return {
        code: -1,
        msg: data.msg,
        data: "",
      };
    } else {
      return {
        code: 0,
        msg: "success",
        data: data.result[0],
      };
    }
  }

  // PicGo-Core 上传处理
  async uploadByClipHandler() {
    const res = await this.uploadByClip();
    const splitList = res.split("\n");
    const lastImage = getLastImage(splitList);

    if (lastImage) {
      return {
        code: 0,
        msg: "success",
        data: lastImage,
      };
    } else {
      new Notice("Please check PicGo-Core config");
      return {
        code: -1,
        msg: "Please check PicGo-Core config",
        data: "",
      };
    }
  }

  // PicGo-Core的剪切上传反馈
  async uploadByClip() {
    let command;
    if (this.settings.picgoCorePath) {
      command = `${this.settings.picgoCorePath} upload`;
    } else {
      command = `picgo upload`;
    }
    const res = await this.exec(command);
    console.log("stdout:", res);
    return res;
  }
  async exec(command: string) {
    let { stdout } = await exec(command);
    const res = await streamToString(stdout);
    return res;
  }
}
