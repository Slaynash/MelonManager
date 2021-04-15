const Pages = {
    MODS: "mods",
    SETTINGS: "settings"
};

const Platform = {
    PC: 0,
    ANDROID: 1
};

const UnityType = {
    MONO: 0,
    IL2CPP: 1
};

var games = [];
var currentSelectedGame = undefined;
var currentSelectedMods = [];
var melonloaderNeedUpdate = false;

var currentPanel = undefined;

var apiSchemes = [];
var apis = [];

var loadingOverlay = undefined;


function quitApp() {
    let remote = require('electron').remote;
    let w = remote.getCurrentWindow();
    w.close();
}



function fetchLocalRepo() {
    return [
        {
            game: "VRChat",
            nameHumanReadable: "VRChat",
            url: "https://api.vrcmg.com/v0/mods.json",
            modarray: "",
            name: "versions[0].name",
            version: "versions[0].modversion",
            author: "versions[0].author",
            aliasesArray: "aliases",
            hash: "versions[0].hash",
            downloadUrl: "versions[0].downloadlink",
            modtype: "versions[0].modtype",
            //modsize: "versions[0].filesize",
            compareUsingHashes: false,
            filter: "versions[0].ApprovalStatus==1",
            mlversion: "0.3.0"
        },
        {
            game: "Audica",
            nameHumanReadable: "Audica",
            url: "https://raw.githubusercontent.com/Ahriana/AudicaModsDirectory/main/api.json",
            modarray: "",
            name: "Name",
            version: "Version",
            author: "Author",
            aliasesArray: "aliases",
            downloadUrl: "Download[0].browser_download_url",
            compareUsingHashes: false,
            mlversion: "0.2.7.4"
        },
        /*{
            game: "TheLongDark",
            nameHumanReadable: "The Long Dark",
            url: "https://tld.xpazeapps.com/api.json",
            modarray: "",
            name: "Name",
            version: "Version",
            author: "Author",
            aliasesArray: "aliases",
            downloadUrl: "Download.browser_download_url",
            compareUsingHashes: false,
            mlversion: "0.2.7.4"
        },*/
        {
            game: "BloonsTD6",
            nameHumanReadable: "Bloons TD6",
            url: "https://raw.githubusercontent.com/Inferno-Dev-Team/Inferno-Omnia/main/version.json",
            modarray: "",
            name: "",
            version: "Version",
            author: "Author",
            mlversion: "0.3.0"
        },

        {
            game: "com.vrchat.oculus.quest",
            nameHumanReadable: "VRChat",
        },
        {
            game: "com.beatgames.beatsaber",
            nameHumanReadable: "Beat Saber",
        },

    ];
}



function showPanel(panel) {
    console.log("Showing page " + panel);

    if (currentPanel !== undefined) {
        document.getElementById("button-" + currentPanel).classList.remove("selected");
        document.getElementById("panel-" + currentPanel).classList.remove("selected");
    }
    document.getElementById("button-" + panel).classList.add("selected");
    document.getElementById("panel-" + panel).classList.add("selected");

    currentPanel = panel;
}

function showGameSelect(show) {
    let dd = document.getElementsByClassName("dropdown-game-dropdown")[0];
    dd.style.display = show ? "flex" : "none";
}

async function selectGame(game) {
    let util = require('util');
    let exec = util.promisify(require('child_process').execFile);

    console.log("Select game " + game.name);
    showGameSelect(false);
    if (game == currentSelectedGame)
        return;
    
    currentSelectedGame = game;
    currentSelectedMods = [];
    document.getElementById("dropdown-game-selected-title").innerHTML = game.name;

    let container = document.getElementById("panel-mods-content");
    container.innerHTML = "";

    let api = apis[game.identifier.toLowerCase()];

    if (!api) {
        container.innerHTML = "<div class=\"panel-mods-error\">No mods found for " + game.name + ".<br />Make sure you have registered the API correctly.</div>";
        return;
    }

    console.log(api);

    // Refresh the installed mods
    if (game.platform == Platform.PC) {
        loadingOverlay.innerHTML = "Listing mods...";
        loadingOverlay.style.display = "";

        let melongameinfos = undefined;
        try {
            let {stdout, stderr} = await exec("MelonManagerUtils.exe", ["getmeloninfos", game.path]);
            melongameinfos = JSON.parse(stdout);
            console.log(melongameinfos);
        }
        catch (e) {
            console.error(e);
        }

        game.melonloaderversion = melongameinfos.melonloaderversion;
        melonloaderNeedUpdate = game.melonloaderversion != api.mlversion;
        game.mods = [];
        for (let mod of melongameinfos.mods) {
            game.mods.push({
                name: mod.name,
                version: mod.version,
                path: mod.path
            })
        }

        console.log(game);

        loadingOverlay.style.display = "none";
    }



    let installedMods = game?.mods || [];

    for (let mod of api.mods) {

        let installedMod = installedMods.find(e => e.name.toLowerCase() == mod.name.toLowerCase());

        let modbox = document.createElement("div");
        modbox.className = "mod-box";
        if (installedMod !== undefined) {
            if (installedMod.version !== mod.version) { // TODO use advanced version comparison + hash check if told to
                modbox.className += " outdated";
                currentSelectedMods.push(mod);
            }
            else
                modbox.className += " installed";
        }

        let modtitle = document.createElement("div");
        modtitle.className = "mod-box-title";
        modtitle.textContent = mod.name;
        modbox.appendChild(modtitle);

        let modauthor = document.createElement("div");
        modauthor.className = "mod-box-author";
        modauthor.textContent = mod.author || "";
        modbox.appendChild(modauthor);

        modbox.addEventListener('click', event => toggleModSelection(mod, modbox));

        container.appendChild(modbox);
    }

    let installButton = document.getElementById("install-button");
    installButton.disabled = currentSelectedMods.length == 0 && !melonloaderNeedUpdate;
}

function getInstalledMod(mod) {
    return currentSelectedGame?.mods?.find(e => e.name.toLowerCase() == mod.name.toLowerCase());
}

function isModInstalled(mod) {
    return currentSelectedGame?.mods?.find(e => e.name.toLowerCase() == mod.name.toLowerCase()) !== undefined;
}

function showConfirmationPopup(text, onAgree) {
    let popup = document.getElementById("confirmation-popup");
    let content = document.getElementById("confirmation-popup-content");
    let agreeButton = document.getElementById("confirmation-popup-agree");
    let cancelButton = document.getElementById("confirmation-popup-cancel");
    
    content.innerHTML = text;
    content.parentElement.classList.remove('popup-error');
    agreeButton.style.display = "";
    let newAgree = agreeButton.cloneNode(true);
    agreeButton.replaceWith(newAgree);
    agreeButton = newAgree;
    agreeButton.addEventListener('click', event => {
        hidePopup();
        onAgree();
    });
    cancelButton.textContent = 'Cancel';
    popup.style.display = "";
}

function showErrorPopup(text) {
    let popup = document.getElementById("confirmation-popup");
    let content = document.getElementById("confirmation-popup-content");
    let agreeButton = document.getElementById("confirmation-popup-agree");
    let cancelButton = document.getElementById("confirmation-popup-cancel");
    
    content.innerHTML = text;
    content.parentElement.classList.add('popup-error');
    agreeButton.style.display = "none";
    cancelButton.textContent = 'Close';
    popup.style.display = "";
}

function hidePopup() {
    let popup = document.getElementById("confirmation-popup");
    popup.style.display = "none";
}

function showInstallPopup() {

    let modlisthtml = '';

    if (melonloaderNeedUpdate) {
        let api = apis[currentSelectedGame.identifier.toLowerCase()];
        modlisthtml += `<br>&nbsp;&bull; MelonLoader ${api.mlversion}<br>`;
    }

    for (let mod of currentSelectedMods)
        modlisthtml += `<br>&nbsp;&bull; ${mod.name.replace(" ", "&nbsp;")}`;

    showConfirmationPopup(`The following mods will be installed/updated:<br>${modlisthtml}`, () => {
        // TODO download / update mods
    });
}

function toggleModSelection(mod, modbox) {

    if (isModInstalled(mod)) {
        let modNameHTML = `<font style="font-weight: bold">${mod.name.replace(" ", "&nbsp;")}</font>`;
        showConfirmationPopup(`You are about to uninstall ${modNameHTML}.<br>Do you want to continue?`, () => {
            let fs = require('fs');
            try {
                fs.unlinkSync(getInstalledMod(mod).path);
                modbox.classList.remove("installed", "outdated");
                currentSelectedMods.splice(currentSelectedMods.indexOf(mod), 1);
                console.log(`removing ${mod.name} from currentSelectedGame.mods`);
                console.log(currentSelectedGame.mods);
                currentSelectedGame.mods.splice(currentSelectedGame.mods.findIndex(sgm => sgm.name == mod.name), 1);
                console.log(currentSelectedGame.mods);

                let installButton = document.getElementById("install-button");
                installButton.disabled = currentSelectedMods.length == 0 && !melonloaderNeedUpdate;
            } catch (err) {
                console.error(err);
                showErrorPopup(`Failed to uninstall ${modNameHTML}:<br><br><pre><code>${err?.toString()?.replace('\n', '<br>')}</code></pre>`);
            }
        });
        return;
    }

    let modIndexInList = currentSelectedMods.indexOf(mod);
    if (modIndexInList >= 0) {
        currentSelectedMods.splice(modIndexInList, 1)
        modbox.classList.remove("checked");
    }
    else {
        currentSelectedMods.push(mod)
        modbox.classList.add("checked");
    }

    let installButton = document.getElementById("install-button");
    installButton.disabled = currentSelectedMods.length == 0 && !melonloaderNeedUpdate;
}

async function init() {
    loadingOverlay = document.getElementById("loading-overlay");
    
    let dropdownGames = document.getElementsByClassName('dropdown-game')[0];
    let dropdownGamesContainer = document.getElementsByClassName('dropdown-game-dropdown')[0];
    document.addEventListener('click', event => {
        let shown = dropdownGamesContainer.style.display == "flex";
        let clickedInContainer = dropdownGamesContainer === event.target || dropdownGamesContainer.contains(event.target);
        let clickedOnTitle = !clickedInContainer && (dropdownGames === event.target || dropdownGames.contains(event.target));
        //console.log("shown: " + shown + ", clickedInContainer: " + clickedInContainer + ", clickedOnTitle: " + clickedOnTitle);
        if (clickedOnTitle)
            showGameSelect(!shown);
        else if (shown && !clickedInContainer)
            showGameSelect(false);
    });

    if (window.navigator.platform.indexOf('Win') > -1)
        document.getElementsByClassName("confirmation-popup-buttons")[0].classList.add('inverted');

    loadingOverlay.innerHTML = "Fetching APIs...";

    apiSchemes = fetchLocalRepo();

    await fetchAPIs();

    loadingOverlay.innerHTML = "Listing Steam games...";

    await fetchSteamGames();

    loadingOverlay.innerHTML = "Listing Android games...";

    await fetchAndroidGames();

    console.log(games);

    for (let game of games) {
        let title = game.name;
        if (game.platform === Platform.ANDROID) {
            if (game.path.startsWith('1PASH'))
                title += " (Quest)";
            else if (game.path.startsWith('1WMH'))
                title += " (Quest 2)";
            else
                title += " (Android)";
        }
        
        
        let gameDiv = document.createElement("div");
        gameDiv.className = "dropdown-game-element";

        let titleDiv = document.createElement("div");
        titleDiv.className = "dropdown-title";
        titleDiv.innerHTML = title;
        titleDiv.title = title;
        gameDiv.appendChild(titleDiv);
        
        let pathDiv = document.createElement("div");
        pathDiv.className = "dropdown-path";
        pathDiv.innerHTML = game.path;
        pathDiv.title = game.path;
        gameDiv.appendChild(pathDiv);

        gameDiv.addEventListener("click", event => selectGame(game));

        dropdownGamesContainer.insertBefore(gameDiv, dropdownGamesContainer.firstChild);
    }

    showPanel(Pages.MODS);

    loadingOverlay.style.display = "none";
    
}

async function fetchAPIs() {
    for (let [_, scheme] of Object.entries(apiSchemes)) {
        let nameLower = scheme.game.toLowerCase();
        if (apis[nameLower] == undefined)
            apis[nameLower] = {
                nameHumanReadable: scheme.nameHumanReadable,
                mlversion: scheme.mlversion,
                compareUsingHashes: scheme.compareUsingHashes || false,
                mods: []
            };
        
        if (scheme.url === undefined)
            continue;

        loadingOverlay.innerHTML = "Fetching " + scheme.nameHumanReadable + "'s mods from<br>" + scheme.url + "...";
        let rawDataRequest = await fetch(scheme.url);
        if (!rawDataRequest.ok) {
            loadingOverlay.innerHTML = "<span style='color: red;'>Failed to fetch " + scheme.nameHumanReadable + " mods (E" + rawDataRequest.status + ")</span>";
        }
        let rawData = await rawDataRequest.json();

        let modListRoot = scheme.modarray == "" ? rawData : rawData[scheme.modarray];
        modListRoot = Object.entries(modListRoot);

        for (let [modIndex, modData] of modListRoot) {

            if (!filterValid(modIndex, modData, scheme.filter))
                continue;

            apis[nameLower].mods.push({
                name: getJsonPart(modIndex, modData, scheme.name),
                version: getJsonPart(modIndex, modData, scheme.version),
                author: getJsonPart(modIndex, modData, scheme.author),
                url: getJsonPart(modIndex, modData, scheme.downloadUrl),
                aliases: getJsonPart(modIndex, modData, scheme.aliasesArray),
                hash: getJsonPart(modIndex, modData, scheme.hash),
                type: (getJsonPart(modIndex, modData, scheme.modtype) || "mod").toLowerCase()
            });
        }
    }

    console.log(apis);
}

function getJsonPart(index, json, scheme) {
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
        return getJsonPart(index, ret, schemeParts[1]);
    
    return ret;
}

function filterValid(index, json, scheme) {
    if (scheme == undefined || scheme == "")
        return true;

    let compareParts = scheme.split("==");
    return getJsonPart(index, json, compareParts[0]) == compareParts[1];
}

async function fetchSteamGames() {
    let util = require('util');
    let exec = util.promisify(require('child_process').execFile);

    let steamgames = undefined;
    try {
        let {stdout, stderr} = await exec("MelonManagerUtils.exe", ["liststeamgames"]);
        steamgames = JSON.parse(stdout);
        console.log(steamgames);
    }
    catch (e) {
        console.error(e);
    }

    for (let steamgame of steamgames) {
        let apiData = apis[steamgame.name.toLowerCase()];
        if (apiData !== undefined) {
            games.push({
                identifier: steamgame.name,
                name: apiData.nameHumanReadable,
                path: steamgame.path,
                arch: steamgame.arch,
                platform: Platform.PC
            });
        }
    }

    /*
    games.push({
        name: "VRChat",
        path: "D:\\jeux\\Steam\\SteamApps\\common\\VRChat",
        platform: Platform.PC,
        // type: UnityType.IL2CPP,
        arch: "x64",
        mods: [
            {name: "AskToPortal", version: "2.1.1"},
            {name: "CloningBeGone", version: "1.0.1"},
            {name: "ComponentToggle", version: "1.4.1"},
            {name: "HWIDPatch", version: "1.0.1"},
            {name: "JoinNotifier", version: "0.2.10"},
            {name: "PlayerList", version: "1.2.11"},
            {name: "SparkleBeGone", version: "1.0.2"},
            {name: "UI Expansion Kit", version: "0.2.5"},
            {name: "CameraMinus", version: "1.1.1"},
            {name: "DownloadFix", version: "1.0.2"},
            {name: "Emoji Page Buttons", version: "1.0.1"},
            {name: "FavCat", version: "1.0.12"},
            {name: "MultiplayerDynamicBonesMod", version: "1040.3"},
            {name: "ReloadAvatars", version: "1.0.2"},
            {name: "UserInfoExtensions", version: "2.4.1"}
        ]
    });
    games.push({
        name: "ChilloutVR",
        path: "D:\\jeux\\Steam\\SteamApps\\common\\ChilloutVR",
        platform: Platform.PC,
        // type: UnityType.Mono,
        arch: "x64",
        mods: []
    });
    games.push({
        name: "BloonsTD6",
        path: "D:\\jeux\\Steam\\SteamApps\\common\\BloonsTD6",
        platform: Platform.PC,
        // type: UnityType.IL2CPP,
        arch: "x64",
        mods: []
    });
    */
}

async function fetchOculusGames() {

}

async function fetchAndroidGames() {
    let util = require('util');
    let exec = util.promisify(require('child_process').exec);
    
    let devices = [];
    try {
        let {stdout, stderr} = await exec('"platform-tools/adb" devices');
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
            loadingOverlay.innerHTML = `Listing installed games<br>from Oculus Quest (${device})`;
        else if (device.startsWith('1WMH'))
            loadingOverlay.innerHTML = `Listing installed games<br>from Oculus Quest 2 (${device})`;
        else
            loadingOverlay.innerHTML = `Listing installed games<br>from Android device (${device})`;
        try {
            let {stdout, stderr} = await exec('"platform-tools/adb" -s ' + device + ' shell pm list packages -3 -f');
            for (let line of stdout.replace('\r','').split('\n')) {
                line = line.trim();
                if (line == "")
                    continue;
                
                console.log(line);
                let lineParts = line.split('.apk=');
                lineParts[0] = lineParts[0].substring("package:".length) + ".apk";

                let apiData = apis[lineParts[1].toLowerCase()];
                if (apiData !== undefined) {
                    games.push({
                        identifier: lineParts[1],
                        name: apiData.nameHumanReadable,
                        path: device + ":" + lineParts[0],
                        arch: "ARM", // TODO
                        platform: Platform.ANDROID
                    });
                }
            }
        }
        catch (e) {
            console.error(e);
        }
    }
}

async function fetchMelonMods() {
    let util = require('util');
    let exec = util.promisify(require('child_process').execFile);

    let steamgames = undefined;
    try {
        let {stdout, stderr} = await exec("MelonManagerUtils", ["liststeamgames"]);
        steamgames = JSON.parse(stdout);
        console.log(steamgames);
    }
    catch (e) {
        console.error(e);
    }
}









document.addEventListener('DOMContentLoaded', function() {
    init();
}, false);