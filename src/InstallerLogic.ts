import { LocalMod } from "./interfaces/LocalMod";
import { GameData } from "./interfaces/GameData";
import { RemoteMod } from "./interfaces/RemoteMod";
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as extract_zip from 'extract-zip';
import { ModsPanelManager } from "./ModsPanelManager";
import { Localization } from "./Localization";
import { PopupManager } from "./PopupManager";
import fetch, { Response } from 'node-fetch';
import { App } from "./App";
import { GamesManager } from "./GamesManager";

export class InstallerLogic {

    private static readonly MELONLOADER_REPOSITORY = "https://github.com/LavaGang/MelonLoader/releases/download";

    public static async installAndUpdate(game: GameData, mods: RemoteMod[], targetMLVersion: string) {
        console.log('Running installAndUpdate');
        App.setInstalling(true);
        ModsPanelManager.updateProgressBar(0, '');

        let totalSize = 0;
        let totalSizeDownloaded = 0;
        for (let mod of mods)
            totalSize += mod.size || 500_000; // If not define, then roll back to "500KB"

        if (!!targetMLVersion) {
            if (game.melonloaderversion !== undefined) {
                console.log('Uninstalling old melonloader');
            }

            let downloadurl = `${this.MELONLOADER_REPOSITORY}/v${targetMLVersion}/MelonLoader.${game.arch}.zip`;
            //let downloadurl = `https://speed.hetzner.de/1GB.bin`;

            let tmpfilePath = path.join(os.tmpdir(), `MelonLoader.${targetMLVersion}.${game.arch}.zip`);

            ModsPanelManager.updateProgressBar(0, Localization.getLocalizedText('install-downloading-ml').replace('{0}', `MelonLoader ${targetMLVersion} (${game.arch})`))

            console.log('Starting download');
            try {
                let size = 0;
                await this.downloadFile(downloadurl, tmpfilePath,
                    progress => {
                        let progressTotal = (progress * size) / totalSize;
                        progressTotal = Math.trunc(progressTotal * 100);
                        ModsPanelManager.updateProgressBar(progressTotal);
                    },
                    response => {
                        size = Number(response.headers.get('content-length'));
                        console.log('ML size: ' + size);
                        totalSize += size;
                    });
                totalSizeDownloaded = size;
            }
            catch (err) {
                console.error(err);
                let popup = PopupManager.showErrorPopup(
                    `${Localization.getLocalizedText('install-download-failed').replace('{0}', `MelonLoader ${targetMLVersion} (${game.arch})`)}:<br /><br /><pre><code>${err}</code></pre>`,
                    () => {
                        PopupManager.hidePopup(popup);
                        ModsPanelManager.selectGame(game);
                    });
                return;
            }
            console.log('Done downloading. Deleting MelonLoader folder');

            fs.rmdirSync(path.join(game.path, 'MelonLoader'), {recursive: true});

            console.log('Done. extracting MelonLoader');
            ModsPanelManager.updateProgressBar(undefined, Localization.getLocalizedText('install-extracting-ml').replace('{0}', `MelonLoader ${targetMLVersion} (${game.arch})`))
            try {
                await extract_zip(tmpfilePath, { dir: game.path });
            } catch (err) {
                console.error(err);
                let popup = PopupManager.showErrorPopup(
                    `${Localization.getLocalizedText('install-extract-failed').replace('{0}', `MelonLoader ${targetMLVersion} (${game.arch})`)}:<br /><br /><pre><code>${err}</code></pre>`,
                    () => {
                        PopupManager.hidePopup(popup);
                        ModsPanelManager.selectGame(game);
                    });
                return;
            }

            console.log('Done. Deleting temp MelonLoader archive');
            fs.rmSync(tmpfilePath, { force: true });


            console.log('Done.');
        }

        if (!fs.existsSync(path.join(game.path, 'Mods')))
            fs.mkdirSync(path.join(game.path, 'Mods'));
        if (!fs.existsSync(path.join(game.path, 'Plugins')))
            fs.mkdirSync(path.join(game.path, 'Plugins'));

        console.log('Installing/Updating mods');
        for (let [index, remoteMod] of Object.entries(mods)) {
            let isPlugin = remoteMod.type === 'plugin';
            ModsPanelManager.updateProgressBar(undefined, Localization.getLocalizedText('install-downloading-' + (isPlugin ? 'plugin' : 'mod')).replace('{0}', remoteMod.name))
            
            let localMod = GamesManager.resolveLocalModFromRemoteMod(game, remoteMod);
            if (!!localMod)
                this.deleteModFile(localMod);
            
            let targetPath = localMod?.path || path.join(game.path, isPlugin ? 'Plugins' : 'Mods', remoteMod.name + '.dll')

            try {
                let baseProgression = totalSizeDownloaded / totalSize;
                let progressImpact = (remoteMod.size || 500_000) / totalSize;
                await this.downloadFile(remoteMod.url, targetPath,
                    progress => {
                        let progressTotal = baseProgression + (progress * progressImpact);
                        progressTotal = Math.trunc(progressTotal * 100);
                        ModsPanelManager.updateProgressBar(progressTotal);
                    });
                totalSizeDownloaded += remoteMod.size || 500_000;
            }
            catch (err) {
                console.error(err);
                await PopupManager.showErrorPopupBlocking(
                    `${Localization.getLocalizedText('install-download-failed').replace('{0}', remoteMod.name)}:<br /><br /><pre><code>${err}</code></pre>`,
                    popup => PopupManager.hidePopup(popup));
            }
        }
        console.log('Done.');
        
        ModsPanelManager.updateProgressBar(100, 'Installation finished');

        ModsPanelManager.selectGame(game);

        App.setInstalling(false);
    }

    public static deleteModFile(currentSelectedLocalMod: LocalMod) {
        fs.unlinkSync(currentSelectedLocalMod.path);
    }

    private static downloadFile(url: string, dest: string, onProgress?: (progress: number) => void, onResponse?: (response: Response) => void): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let file = fs.createWriteStream(dest);

            let totalLength = 0;
            let downloadedLength = 0;
            let percent = 0;
            let res = await fetch(url);

            if (!!onResponse)
                onResponse(res);
            
            if (!res.ok) {
                reject(new Error(`HTTP error ${res.status}`));
                fs.unlinkSync(dest);
            }

            totalLength = Number(res.headers.get('content-length'));
            res.body.pipe(file);

            res.body.on('data', chunk => {
                downloadedLength += chunk.length;
                let newPercent = Math.trunc(downloadedLength / totalLength * 100) * 0.01;
                if (newPercent != percent) {
                    percent = newPercent;
                    if (!!onProgress)
                        onProgress(percent);
                }
            })
            
            file.on('finish', () => {
                file.close();
                resolve();
            })
            file.on('error', err => {
                fs.unlinkSync(dest);
                reject(err);
            })
        });
    }
}