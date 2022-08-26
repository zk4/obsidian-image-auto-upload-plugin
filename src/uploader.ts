import { PluginSettings } from "./setting";
import { streamToString, getLastImage } from "./utils";
import { exec } from "child_process";
import { Notice, requestUrl } from "obsidian";

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
    const response = await requestUrl({
      url: this.settings.uploadServer,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list: fileList }),
    });

    const data = response.json;
    return data;
  }

  async uploadFileByClipboard(): Promise<any> {
    const res = await requestUrl({
      url: this.settings.uploadServer,
      method: "POST",
    });

    let data: PicGoResponse = res.json;

    if (res.status !== 200) {
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
    const response = await requestUrl({
      url: this.settings.uploadServer,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list: fileList }),
    });
    const data = response.json;
    return data;
  }

  // PicGo-Core 上传处理
  async uploadFileByClipboard() {
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
      new Notice(`"Please check PicGo-Core config"\n${res}`);
      return {
        code: -1,
        msg: `"Please check PicGo-Core config"\n${res}`,
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
