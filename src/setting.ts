import { App, PluginSettingTab, Setting } from "obsidian";
import imageAutoUploadPlugin from "./main";
import { t } from "./lang/helpers";
import { getOS } from "./utils";

export interface PluginSettings {
  uploadByClipSwitch: boolean;
  uploadServer: string;
  uploader: string;
  picgoCorePath: string;
  menuMode: string;
  workOnNetWork: boolean;
  fixPath: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  uploadByClipSwitch: true,
  uploader: "PicGo",
  uploadServer: "http://127.0.0.1:36677/upload",
  picgoCorePath: "",
  menuMode: "auto",
  workOnNetWork: false,
  fixPath: false,
};

export class SettingTab extends PluginSettingTab {
  plugin: imageAutoUploadPlugin;

  constructor(app: App, plugin: imageAutoUploadPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    const os = getOS()

    containerEl.empty();
    containerEl.createEl("h2", { text: t("Plugin Settings") });
    new Setting(containerEl)
      .setName(t("Auto pasted upload"))
      .setDesc(
        t(
          "If you set this value true, when you paste image, it will be auto uploaded(you should set the picGo server rightly)"
        )
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.uploadByClipSwitch)
          .onChange(async value => {
            this.plugin.settings.uploadByClipSwitch = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("Default uploader"))
      .setDesc(t("Default uploader"))
      .addDropdown(cb =>
        cb
          .addOption("PicGo", "PicGo(app)")
          .addOption("PicGo-Core", "PicGo-Core")
          .setValue(this.plugin.settings.uploader)
          .onChange(async value => {
            this.plugin.settings.uploader = value;
            this.display();
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.uploader === "PicGo") {
      new Setting(containerEl)
        .setName(t("PicGo server"))
        .setDesc(t("PicGo server"))
        .addText(text =>
          text
            .setPlaceholder(t("Please input PicGo server"))
            .setValue(this.plugin.settings.uploadServer)
            .onChange(async key => {
              this.plugin.settings.uploadServer = key;
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.uploader === "PicGo-Core") {
      new Setting(containerEl)
        .setName(t("PicGo-Core path"))
        .setDesc(
          t("Please input PicGo-Core path, default using environment variables")
        )
        .addText(text =>
          text
            .setPlaceholder("")
            .setValue(this.plugin.settings.picgoCorePath)
            .onChange(async value => {
              this.plugin.settings.picgoCorePath = value;
              await this.plugin.saveSettings();
            })
        );

      if (os !== 'Windows') {
        new Setting(containerEl)
          .setName(t("fixPath"))
          .setDesc(t("fixPathWarning"))
          .addToggle(toggle =>
            toggle
              .setValue(this.plugin.settings.fixPath)
              .onChange(async value => {
                this.plugin.settings.fixPath = value;
                await this.plugin.saveSettings();
              })
          );
      }
    }

    new Setting(containerEl)
      .setName(t("Upload contextMenu mode"))
      .setDesc(
        t(
          "It should be set like your ob setting, otherwise the feature can not be work."
        )
      )
      .addDropdown(cb =>
        cb
          .addOption("auto", "auto")
          .addOption("absolute", t("absolute"))
          .addOption("relative", t("relative"))
          .setValue(this.plugin.settings.menuMode)
          .onChange(async value => {
            this.plugin.settings.menuMode = value;
            this.display();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("Work on network"))
      .setDesc(
        t(
          "When you paste, md standard image link in your clipboard will be auto upload."
        )
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.workOnNetWork)
          .onChange(async value => {
            this.plugin.settings.workOnNetWork = value;
            this.display();
            await this.plugin.saveSettings();
          })
      );
  }
}
