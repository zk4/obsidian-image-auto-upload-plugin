import { App, PluginSettingTab, Setting } from "obsidian";
import imageAutoUploadPlugin from "./main";

export interface PluginSettings {
  uploadByClipSwitch: boolean;
  uploadServer: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  uploadByClipSwitch: true,
  uploadServer: "http://127.0.0.1:36677/upload",
};

export class SettingTab extends PluginSettingTab {
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
      .setName("pasted auto upload Switch")
      .setDesc(
        "if you set this value true, when you paste image, it will be auto uploaded(you should set the picGo server rightly)"
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
