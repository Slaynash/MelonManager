import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        backgroundColor: "#202225",
        webPreferences: {
            enableRemoteModule: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile(path.join(__dirname, "../index.html"));
}

app.on('ready', () => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    })
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});