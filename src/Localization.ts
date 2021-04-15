import { remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class Localization {
    private constructor() {}

    private static english: Map<string, string> = new Map();
    private static currentLanguage: Map<string, string> = new Map();

    public static init(): void {
        this.english = this.objToStrMap(JSON.parse(fs.readFileSync('./locales/en.json', 'utf8')));

        let localCountryCode = 'en'; //remote.app.getLocaleCountryCode().toLowerCase();
        console.log("Locale: " + localCountryCode);
        if (localCountryCode != 'en' && fs.existsSync(`./locales/${localCountryCode}.json`))
            this.currentLanguage = this.objToStrMap(JSON.parse(fs.readFileSync(`./locales/${localCountryCode}.json`, 'utf8')));
        console.log("currentLanguage: ");
        console.log(this.currentLanguage)
    }

    public static getLocalizedText(identifier: string): string {
        return this.currentLanguage.get(identifier) || this.english.get(identifier) || identifier;
    }

    private static objToStrMap(obj: any): Map<string, string> {
        let strMap = new Map<string, string>()
        for (let k of Object.keys(obj))
            strMap.set(k, obj[k]);
        return strMap;
    }
}