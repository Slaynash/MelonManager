import { Platform } from "../enums/Platform";
import { LocalMod } from "./LocalMod";

export interface GameData {
    // Original check
    identifier: string;
    name: string;
    path: string;
    arch: string;
    platform: Platform;

    // Melon check
    melonloaderversion: string;
    mods: LocalMod[];
    melonloaderNeedsUpdate: boolean;
}