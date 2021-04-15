import { RemoteMod } from "./RemoteMod";

export interface ApiData {
    nameHumanReadable: string
    mlversion: string
    compareUsingHashes: boolean
    mods: RemoteMod[]
}