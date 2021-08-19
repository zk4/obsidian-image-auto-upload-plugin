import { App, PluginSettingTab, Setting } from "obsidian";
import imageAutoUploadPlugin from "./main";

export interface PluginSettings {
  uploadServer: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
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
