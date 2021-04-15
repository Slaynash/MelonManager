import { MelonGameInfos } from "./interfaces/MelonGameInfos";
import { Platform } from "./enums/Platform";
import { GameData } from "./interfaces/GameData";
import { PopupManager } from "./PopupManager";
import * as child_process from "child_process";
import { GamesManager } from "./GamesManager";
import { RemoteMod } from "./interfaces/RemoteMod";
import { ApisManager } from "./ApisManager";
import * as util from "util";
import { Localization } from "./Localization";
import { VersionUtils } from "./VersionUtils";
import { InstallerLogic } from "./InstallerLogic";

export class ModsPanelManager {
    private static contentElement: HTMLElement;
    private static installButton: HTMLButtonElement;
    private static progressbar: HTMLElement;
    private static progressbarValue: HTMLElement;
    private static currentSelectedMods: RemoteMod[] = [];

    public static init(): void {
        this.contentElement = document.getElementById("panel-mods-content");
        this.installButton = <HTMLButtonElement>document.getElementById("install-button");
        this.progressbar = document.getElementById("progress-bar");
        this.progressbarValue = <HTMLElement>this.progressbar.firstChild;

        this.installButton.addEventListener('click', () =>
            this.showInstallPopup());

        this.installButton.innerHTML = Localization.getLocalizedText('button-install')
        this.showError(Localization.getLocalizedText("no-game-selected"));
    }
    
    public static showError(error: string) {
        this.contentElement.innerHTML = `<div class="panel-mods-error">${error}</div>`;
    }

    public static async selectGame(game: GameData) {
        this.clear();

        let api = ApisManager.getApi(game.identifier);
        if (!api) {
            ModsPanelManager.showError(Localization.getLocalizedText('modspanel-nomodfound').replace('{0}', game.name));
            return;
        }

        if (game.platform == Platform.PC) {
            PopupManager.showOverlay(Localization.getLocalizedText('modspanel-listing-mods'));

            let melongameinfos: MelonGameInfos;
            try {
                let execResult = await util.promisify(child_process.exec)(`"MelonManagerUtils" getmeloninfos "${game.path.replace('\\', '\\\\').replace('\"', '\\\"')}"`);
                melongameinfos = JSON.parse(execResult.stdout);
                console.log(melongameinfos);
            }
            catch (e) {
                console.error(e);
                // TODO
            }

            game.melonloaderversion = melongameinfos.melonloaderversion;
            game.melonloaderNeedsUpdate = game.melonloaderversion != api.mlversion;
            game.mods = [];
            for (let mod of melongameinfos.mods) {
                game.mods.push({
                    name: mod.name,
                    version: mod.version,
                    path: mod.path
                })
            }

            PopupManager.hideOverlay();
        }

        for (let mod of api.mods) {

            let installedMod = GamesManager.resolveLocalModFromRemoteMod(game, mod);

            let additionalClass = '';
            if (installedMod !== undefined) {
                if (VersionUtils.compareVersion(installedMod.version, mod.version) < 0) {
                    this.currentSelectedMods.push(mod);
                    additionalClass = 'outdated';
                }
                else
                    additionalClass = 'installed';
            }

            let template = document.createElement('div');
            template.innerHTML = `
                <div class="mod-box ${additionalClass}">
                    <div class="mod-box-title">${mod.name}</div>
                    <div class="mod-box-author">${mod.author}</div>
                </div>`.trim();
            let modbox = <HTMLElement>template.firstChild.cloneNode(true);
            modbox.addEventListener("click", () => this.toggleModSelection(mod, modbox));
            this.contentElement.append(modbox);
        }

        this.installButton.disabled = this.currentSelectedMods.length == 0 && !game.melonloaderNeedsUpdate;
    }

    public static updateProgressBar(progress?: number, text?: string) {
        if (progress !== undefined)
            this.progressbarValue.style.width = `${progress}%`;
        if (text !== undefined)
            this.progressbar.setAttribute('data-label', text);
    }


    private static clear() {
        this.contentElement.innerHTML = '';
        this.currentSelectedMods = [];
    }

    private static toggleModSelection(mod: RemoteMod, modbox: HTMLElement) {
        let currentSelectedGame: GameData = GamesManager.getCurrentGame();
        let currentSelectedLocalMod = currentSelectedGame.mods.find(e => e.name.toLowerCase() == mod.name.toLowerCase());
        let modNameHTML = `<font style="font-weight: bold">${mod.name.replace(" ", "&nbsp;")}</font>`;
        if (currentSelectedLocalMod !== undefined) {
            let popup = PopupManager.showPopup(Localization.getLocalizedText('modspanel-confirm-uninstall').replace('{0}', modNameHTML), () => {
                console.log(`removing ${mod.name}`);
                try {
                    InstallerLogic.deleteModFile(currentSelectedLocalMod);
                    modbox.classList.remove("installed", "outdated");
                    this.currentSelectedMods.splice(this.currentSelectedMods.indexOf(mod), 1);
                    currentSelectedGame.mods.splice(currentSelectedGame.mods.findIndex(sgm => sgm.name == mod.name), 1);

                    this.installButton.disabled = this.currentSelectedMods.length == 0 && !currentSelectedGame.melonloaderNeedsUpdate;
                    PopupManager.hidePopup(popup);
                } catch (err) {
                    console.error(err);
                    PopupManager.showErrorPopup(`${Localization.getLocalizedText('modspanel-failed-uninstall').replace('{0}', modNameHTML)}:<br><br><pre><code>${err?.toString()?.replace('\n', '<br>')}</code></pre>`);
                }
            });
        }
        else {
            let modIndexInList = this.currentSelectedMods.indexOf(mod);
            if (modIndexInList >= 0) {
                this.currentSelectedMods.splice(modIndexInList, 1)
                modbox.classList.remove("checked");
            }
            else {
                this.currentSelectedMods.push(mod)
                modbox.classList.add("checked");
            }
        
            this.installButton.disabled = this.currentSelectedMods.length == 0 && !currentSelectedGame.melonloaderNeedsUpdate;
        }
    }

    private static showInstallPopup() {

        let modlisthtml = '';
    
        let currentSelectedGame = GamesManager.getCurrentGame();

        let targetML: string = null;

        if (currentSelectedGame.melonloaderNeedsUpdate) {
            let api = ApisManager.getApi(currentSelectedGame.identifier);
            targetML = api.mlversion;
            modlisthtml += `<br>&nbsp;&bull; MelonLoader ${targetML}<br>`;
        }
    
        for (let mod of this.currentSelectedMods)
            modlisthtml += `<br>&nbsp;&bull; ${mod.name.replace(" ", "&nbsp;")}`;
    
        let popupConfirm = PopupManager.showPopup(`${Localization.getLocalizedText('modspanel-confirm-install')}:<br>${modlisthtml}`, () => {
            InstallerLogic.installAndUpdate(currentSelectedGame, this.currentSelectedMods, targetML);
            PopupManager.hidePopup(popupConfirm);
        });
    }
}