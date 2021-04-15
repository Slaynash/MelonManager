import { GameData } from "./interfaces/GameData";
import { Platform } from "./enums/Platform";
import { ApisManager } from "./ApisManager";
import { ModsPanelManager } from "./ModsPanelManager";
import * as child_process from "child_process";
import { PopupManager } from "./PopupManager";
import * as util from "util";
import { Localization } from "./Localization";
import { RemoteMod } from "./interfaces/RemoteMod";

export class GamesManager {
    private static games: GameData[] = [];
    private static currentGame: GameData;

    public static async fetchSteamGames() {
        let steamgames = undefined;
        try {
            let {stdout, stderr} = await util.promisify(child_process.exec)(`"./MelonManagerUtils" liststeamgames`);
            steamgames = JSON.parse(stdout);
            console.log(steamgames);
        }
        catch (e) {
            console.error(e);
        }
    
        for (let steamgame of steamgames) {
            let apiData = ApisManager.getApi(steamgame.name.toLowerCase());
            if (apiData !== undefined) {
                this.games.push({
                    identifier: steamgame.name.toLowerCase(),
                    name: apiData.nameHumanReadable,
                    path: steamgame.path,
                    arch: steamgame.arch,
                    platform: Platform.PC,
                    // melon part
                    melonloaderversion: undefined,
                    melonloaderNeedsUpdate: false,
                    mods: undefined
                });
            }
        }
    }

    public static async fetchAndroidGames() {
        let devices: string[] = [];
        try {
            let {stdout, stderr} = await util.promisify(child_process.exec)('"./platform-tools/adb" devices');
            for (let line of stdout.replace('\r','').split('\n')) {
                let lineParts = line.trim().split('\t');
                if (lineParts.length > 1 && lineParts[1] == "device") {
                    console.log("Android device found: " + lineParts[0]);
                    devices.push(lineParts[0]);
                }
            }
        }
        catch (e) {
            console.error(e);
        }

        for (let device of devices) {
            if (device.startsWith('1PASH'))
                PopupManager.showOverlay(Localization.getLocalizedText('games-listing-quest').replace('{0}', device));
            else if (device.startsWith('1WMH'))
                PopupManager.showOverlay(Localization.getLocalizedText('games-listing-quest2').replace('{0}', device));
            else
                PopupManager.showOverlay(Localization.getLocalizedText('games-listing-android').replace('{0}', device));
            try {
                let {stdout, stderr} = await util.promisify(child_process.exec)(`"platform-tools/adb" -s ${device} shell pm list packages -3 -f`);
                for (let line of stdout.replace('\r','').split('\n')) {
                    line = line.trim();
                    if (line == "")
                        continue;
                    
                    console.log(line);
                    let lineParts = line.split('.apk=');
                    lineParts[0] = lineParts[0].substring("package:".length) + ".apk";

                    let apiData = ApisManager.getApi(lineParts[1].toLowerCase());
                    if (apiData !== undefined) {
                        this.games.push({
                            identifier: lineParts[1],
                            name: apiData.nameHumanReadable,
                            path: device + ":" + lineParts[0],
                            arch: "ARM", // TODO
                            platform: Platform.Android,
                            // melon part
                            melonloaderversion: undefined,
                            melonloaderNeedsUpdate: false,
                            mods: undefined
                        });
                    }
                }
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    public static getGames() {
        return this.games;
    }

    public static resolveLocalModFromRemoteMod(game: GameData, mod: RemoteMod) {
        if (game?.mods === undefined)
            return undefined;

        let installedMods = game.mods;

        let installedMod = installedMods.find(e => e.name.toLowerCase() == mod.name.toLowerCase());
        if (!installedMod && mod.aliases !== undefined) {
            for (let alias of mod.aliases) {
                installedMod = installedMods.find(e => e.name.toLowerCase() == alias.toLowerCase());
                if (installedMod !== undefined)
                    break;
            }
        }

        return installedMod
    }

    /*
    public static getLocalModFromGame(game: GameData, name: string): LocalMod {
        if (!!game?.mods)
            return undefined;

        let modName = name.toLowerCase();
        
        let mod: LocalMod = game.mods.find(e => e.name.toLowerCase() == modName);
        if (!mod) {
            for (let rmod of game.mods) {
                if (rmod.)
            }
        }

        return mod;
    }
    */

    public static selectGame(game: GameData) {
        this.currentGame = game;
        ModsPanelManager.selectGame(game);
    }
    
    public static getCurrentGame(): GameData {
        return this.currentGame;
    }
}