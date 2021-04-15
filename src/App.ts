import { remote } from "electron";
import { Panel } from "./enums/Panel";
import { PopupManager } from "./PopupManager";
import { GameDropdownManager } from "./GameDropdownManager";
import { ModsPanelManager } from "./ModsPanelManager";
import { GamesManager } from "./GamesManager";
import { ApisManager } from "./ApisManager";
import { Localization } from "./Localization";

export class App {

    private static lockpane: HTMLElement;

    private static installing: boolean = false;

    private static currentPanel: Panel;
    private static quitConfirmation: HTMLElement;

    public static async init(): Promise<void> {
        // Exit button
        document.getElementById('closebutton').addEventListener('click', () => {
            if (this.installing) {
                if (this.quitConfirmation !== undefined)
                    return;
                
                this.quitConfirmation = PopupManager.showPopup(Localization.getLocalizedText('app-confirm-quit'),
                    () => remote.getCurrentWindow().close(),
                    () => {
                        PopupManager.hidePopup(this.quitConfirmation);
                        this.quitConfirmation = undefined;
                    }, Localization.getLocalizedText('quit'));
            }
            else
                remote.getCurrentWindow().close();
        });
        
        Localization.init();
        PopupManager.init();
        GameDropdownManager.init();
        ModsPanelManager.init();

        this.lockpane = document.getElementById("lock-pane");
        
        document.getElementById("button-mods").firstChild.textContent = Localization.getLocalizedText("mods");
        document.getElementById("button-settings").firstChild.textContent = Localization.getLocalizedText("settings");

        PopupManager.showOverlay(Localization.getLocalizedText('app-init-fetching-api'));

        try {
            await ApisManager.fetchLocalRepo();
            await ApisManager.fetchAPIs();
        }
        catch (e) {
            // TODO
        }


        try {
            PopupManager.showOverlay(Localization.getLocalizedText('app-init-listing-steam'));
            await GamesManager.fetchSteamGames();
            //PopupManager.showOverlay(Localization.getLocalizedText('app-init-listing-oculus'));
            //await GamesManager.fetchOculusGames();
            PopupManager.showOverlay(Localization.getLocalizedText('app-init-listing-android'));
            await GamesManager.fetchAndroidGames();
        }
        catch (e) {
            // TODO
        }

        GameDropdownManager.refreshList();

        this.showPanel(Panel.Mods);
        PopupManager.hideOverlay();
    }


    public static showPanel(panel: Panel): void {
        console.log("Showing page " + panel);

        if (this.currentPanel !== undefined) {
            document.getElementById("button-" + this.currentPanel).classList.remove("selected");
            document.getElementById("panel-" + this.currentPanel).classList.remove("selected");
        }
        document.getElementById("button-" + panel).classList.add("selected");
        document.getElementById("panel-" + panel).classList.add("selected");

        this.currentPanel = panel;
    }

    public static setInstalling(installing: boolean) {
        this.installing = installing;

        this.lockpane.style.display = installing ? 'block' : 'none';
    }
}