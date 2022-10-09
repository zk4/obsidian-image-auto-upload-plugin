import {PluginSettings} from "./setting";
import {streamToString, getLastImage} from "./utils";
import {exec} from "child_process";
import {Notice, requestUrl} from "obsidian";
const fs = require("fs")
const os = require('os')
const path = require('path')
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
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({list: fileList}),
    });

    const data = response.json;
    return data;
  }

  async uploadFileByClipboard(files: any): Promise<any> {
    const res = await requestUrl({
      url: this.settings.uploadServer,
      method: "POST",
    });

    let data: PicGoResponse = res.json;

    if (res.status !== 200) {
      let err = {response: data, body: data.msg};
      return {
        code: -1,
        msg: data.msg,
        data: "",
      };
    } else {
      return {
        code: 0,
        msg: "success",
        data: typeof data.result == "string" ? data.result : data.result[0],
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
    const length = fileList.length;
    let cli = this.settings.picgoCorePath || "picgo";
    let command = `${cli} upload ${fileList
      .map(item => `"${item}"`)
      .join(" ")}`;

    const res = await this.exec(command);
    const splitList = res.split("\n");
    const splitListLength = splitList.length;
    console.log(splitListLength);

    const data = splitList.splice(splitListLength - 1 - length, length);

    if (res.includes("PicGo ERROR")) {
      return {
        success: false,
        msg: "失败",
      };
    } else {
      return {
        success: true,
        result: data,
      };
    }
    // {success:true,result:[]}
  }

  // PicGo-Core 上传处理
  async uploadFileByClipboard(files: any) {
    const res = await this.uploadByClip(files);
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

  makeid(length: number) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
        charactersLength));
    }
    return result;
  }
  dateStamp(){
    return  (new Date()).toISOString().replace(/[^0-9]/g, "")+"."+this.makeid(5);
  }
  async saveClipToFile(file: any) {
    let result = await new Promise((resolve) => {
      let fileReader = new FileReader();
      fileReader.onload = (e) => resolve(fileReader.result);
      fileReader.readAsArrayBuffer(file);
    });

    const fileName = path.join(os.homedir(),`${this.dateStamp()}.jpg`)
    fs.writeFileSync(fileName, Buffer.from(result as ArrayBuffer));
    return fileName;
  }
  // PicGo-Core的剪切上传反馈
  async uploadByClip(files: any) {
    let command;
    let tmpPath;
    if (this.settings.picgoCorePath) {
      tmpPath = await this.saveClipToFile(files[0])
      command = `${this.settings.picgoCorePath} upload ${tmpPath}`;
    } else {
      command = `picgo upload`;
    }
    const res = await this.exec(command);
    if(tmpPath)
      fs.unlinkSync(tmpPath)
    return res;
  }

  async exec(command: string) {
    let {stdout} = await exec(command);
    const res = await streamToString(stdout);
    return res;
  }
}
