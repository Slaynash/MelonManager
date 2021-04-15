import { GamesManager } from "./GamesManager";
import { Platform } from "./enums/Platform";
import { GameData } from "./interfaces/GameData";
import { Localization } from "./Localization";
import { ModsPanelManager } from "./ModsPanelManager";

export class GameDropdownManager {
    private static titleContainerElement: HTMLElement;
    private static listContainerElement: HTMLElement;
    private static titleElement: HTMLElement;

    private static shown: boolean;
    private static currentSelectedGame: GameData;

    public static init(): void {
        this.titleContainerElement = document.getElementById('dropdown-game-title');
        this.listContainerElement = document.getElementById('dropdown-game-container');
        this.titleElement = document.getElementById("dropdown-game-selected-title");

        this.titleContainerElement.firstChild.textContent = Localization.getLocalizedText("game") + ":";
        this.titleElement.textContent = Localization.getLocalizedText("no-game-selected");
        document.getElementById('dropdown-add-another-game').textContent = Localization.getLocalizedText("add-game");
        
        document.addEventListener('click', event => {
            let clickedInContainer = this.listContainerElement === event.target || (event.target instanceof Element && this.listContainerElement.contains(event.target));
            let clickedOnTitle = !clickedInContainer && (this.titleContainerElement === event.target || (event.target instanceof Element && this.titleContainerElement.contains(event.target)));
            
            if (clickedOnTitle)
                this.showGameSelect(!this.shown)
            else if (this.shown && !clickedInContainer)
                this.showGameSelect(false);
        });
    }

    private static showGameSelect(show: boolean): void {
        this.listContainerElement.style.display = (this.shown = show) ? 'flex' : 'none';
    }
    
    public static refreshList(): void {
        for (let game of GamesManager.getGames()) {
            let title = game.name;
            if (game.platform === Platform.Android) {
                if (game.path.startsWith('1PASH'))
                    title += " (Quest)";
                else if (game.path.startsWith('1WMH'))
                    title += " (Quest 2)";
                else
                    title += " (Android)";
            }

            let template = document.createElement('div');
            template.innerHTML = `
                <div class="dropdown-game-element">
                    <div class="dropdown-title" title="${title}">${title}</div>
                    <div class="dropdown-path" title="${game.path}">${game.path}</div>
                </div>`.trim();
            let gameListElement = template.firstChild.cloneNode(true);
            gameListElement.addEventListener("click", () => this.selectGame(game));
            this.listContainerElement.insertBefore(gameListElement, this.listContainerElement.children[this.listContainerElement.children.length - 1]);
        }
    }

    private static async selectGame(game: GameData): Promise<void> {
        console.log("Select game " + game.name);
        this.showGameSelect(false);
        if (game == this.currentSelectedGame)
            return;
        
        this.currentSelectedGame = game;
        this.titleElement.innerText = game.name;

        ModsPanelManager.updateProgressBar(0, '');
        GamesManager.selectGame(game);
    }
}