import { PopupManager } from "./PopupManager";
import { ApiScheme } from "./interfaces/ApiScheme";
import { ApiData } from "./interfaces/ApiData";
import { Localization } from "./Localization";

export class ApisManager {

    public static getApi(identifier: string) {
        return this.apisData.get(identifier.toLowerCase());
    }

    private static schemes: ApiScheme[] = [];
    private static apisData: Map<string, ApiData> = new Map();
    
    public static async fetchLocalRepo() {
        this.schemes = [
            {
                game: "VRChat",
                nameHumanReadable: "VRChat",
                url: "https://api.vrcmg.com/v0/mods.json",
                modarray: "",
                name: "versions[0].name",
                version: "versions[0].modversion",
                author: "versions[0].author",
                description: "versions[0].description",
                tags: undefined,
                banner: undefined,
                aliasesArray: "aliases",
                hash: "versions[0].hash",
                downloadUrl: "versions[0].downloadlink",
                modtype: "versions[0].modtype",
                modsize: undefined, //"versions[0].filesize"
                compareUsingHashes: false,
                filter: "versions[0].ApprovalStatus==1",
                mlversion: "0.3.0"
            },
            {
                game: "Audica",
                nameHumanReadable: "Audica",
                url: "https://raw.githubusercontent.com/Ahriana/AudicaModsDirectory/main/api.json",
                modarray: "",
                name: "",
                version: "Version",
                author: "Author",
                description: undefined,
                tags: undefined,
                banner: undefined,
                aliasesArray: "Name",
                hash: undefined,
                downloadUrl: "Download[0].browser_download_url",
                modtype: undefined,
                modsize: undefined,
                compareUsingHashes: false,
                filter: undefined,
                mlversion: "0.2.7.4"
            },
            {
                game: "TheLongDark",
                nameHumanReadable: "The Long Dark",
                url: "https://tld.xpazeapps.com/api.json",
                modarray: "",
                name: "Name",
                version: "Version",
                author: "DisplayAuthor",
                description: undefined,
                tags: undefined,
                banner: undefined,
                aliasesArray: undefined,
                hash: undefined,
                downloadUrl: "Download.browser_download_url",
                modtype: undefined,
                modsize: undefined,
                compareUsingHashes: false,
                filter: undefined,
                mlversion: "0.2.7.4"
            },
            {
                game: "BloonsTD6",
                nameHumanReadable: "Bloons TD6",
                url: "https://raw.githubusercontent.com/Inferno-Dev-Team/Inferno-Omnia/main/api.json",
                modarray: "",
                name: "Name",
                version: "Version",
                author: "Author",
                description: "Description",
                tags: "Tags",
                banner: "PNGUrl",
                aliasesArray: undefined,
                hash: undefined,
                downloadUrl: "DownloadUrl",
                modtype: undefined,
                modsize: undefined,
                compareUsingHashes: false,
                filter: undefined,
                mlversion: "0.3.0"
            },
    
            {
                game: "com.vrchat.oculus.quest",
                nameHumanReadable: "VRChat",
                url: undefined,
                modarray: undefined,
                name: undefined,
                version: undefined,
                author: undefined,
                description: undefined,
                tags: undefined,
                banner: undefined,
                aliasesArray: undefined,
                hash: undefined,
                downloadUrl: undefined,
                modtype: undefined,
                modsize: undefined,
                compareUsingHashes: false,
                filter: undefined,
                mlversion: undefined
            },
            {
                game: "com.beatgames.beatsaber",
                nameHumanReadable: "Beat Saber",
                url: undefined,
                modarray: undefined,
                name: undefined,
                version: undefined,
                author: undefined,
                description: undefined,
                tags: undefined,
                banner: undefined,
                aliasesArray: undefined,
                hash: undefined,
                downloadUrl: undefined,
                modtype: undefined,
                modsize: undefined,
                compareUsingHashes: false,
                filter: undefined,
                mlversion: undefined
            },
    
        ];
    }

    
    public static async fetchAPIs() {
        for (let [_, scheme] of Object.entries(this.schemes)) {
            let nameLower = scheme.game.toLowerCase();
            let apiData: ApiData = this.apisData.get(nameLower);
            if (!apiData)
                this.apisData.set(nameLower, apiData = {
                    nameHumanReadable: scheme.nameHumanReadable,
                    mlversion: scheme.mlversion,
                    compareUsingHashes: scheme.compareUsingHashes || false,
                    mods: []
                });
            
            if (scheme.url === undefined)
                continue;
    
            PopupManager.showOverlay(Localization.getLocalizedText("api-fetching-mods").replace('{0}', scheme.nameHumanReadable).replace('{1}', scheme.url));
            let rawDataRequest = await fetch(scheme.url);
            if (!rawDataRequest.ok) {
                PopupManager.showOverlay(Localization.getLocalizedText("api-fetching-failed").replace('{0}', scheme.nameHumanReadable).replace('{1}', rawDataRequest.status.toString()));
            }
            let rawData = await rawDataRequest.json();
    
            let modListRoot = scheme.modarray == "" ? rawData : rawData[scheme.modarray];
            modListRoot = Object.entries(modListRoot);
    
            for (let [modIndex, modData] of modListRoot) {
    
                if (!this.filterValid(modIndex, modData, scheme.filter))
                    continue;

                apiData.mods.push({
                    name: this.getJsonPart(modIndex, modData, scheme.name),
                    version: this.getJsonPart(modIndex, modData, scheme.version),
                    author: this.getJsonPart(modIndex, modData, scheme.author),
                    description: this.getJsonPart(modIndex, modData, scheme.description),
                    tags: this.getArray(this.getJsonPart(modIndex, modData, scheme.tags)),
                    banner: this.getJsonPart(modIndex, modData, scheme.banner),
                    url: this.getJsonPart(modIndex, modData, scheme.downloadUrl),
                    aliases: this.getArray(this.getJsonPart(modIndex, modData, scheme.aliasesArray)),
                    hash: this.getJsonPart(modIndex, modData, scheme.hash),
                    type: (this.getJsonPart(modIndex, modData, scheme.modtype) || "mod").toLowerCase(),
                    size: this.getJsonPart(modIndex, modData, scheme.modsize)
                });
            }
        }
    
        console.log(this.apisData);
    }

    private static getJsonPart(index: any, json: any, scheme: string): any {
        if (scheme == undefined)
            return undefined;
        if (scheme == "")
            return index;
        
        let schemeParts = scheme.split(".", 2);
        let ret = undefined;
        if (schemeParts[0].includes("[")) { // array
            let targetParts = schemeParts[0].split("[", 2)
            let targetObject = targetParts[0];
            let targetIndex = targetParts[1].split("]")[0];
            ret = json[targetObject][targetIndex];
        }
        else
            ret = json[schemeParts[0]];
    
        if (schemeParts.length > 1)
            return this.getJsonPart(index, ret, schemeParts[1]);
        
        return ret;
    }

    private static getArray(original: any): any {
        if (typeof original !== 'string')
            return original;
        
        let ret: string[] = [];
        for (let element of original.split(','))
            ret.push(element.trim());

        return ret;
    }
    
    private static filterValid(index: any, json: any, scheme: string): boolean {
        if (scheme == undefined || scheme == "")
            return true;
    
        let compareParts = scheme.split("==");
        return this.getJsonPart(index, json, compareParts[0]) == compareParts[1];
    }

}