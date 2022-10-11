'use strict'

import {app, BrowserWindow, Menu, protocol} from 'electron'
import {createProtocol} from 'vue-cli-plugin-electron-builder/lib'
import {copyAssets, getAssetPath} from './assets'

const isDevelopment = process.env.NODE_ENV !== 'production'
const path = require('path');
const userDataPath = app.getPath('userData');

// If any of the starter assets aren't in the userData path,
// copy them now in the background.
copyAssets();

// Fix for socket connection
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

// Fix for serialport usage
app.allowRendererProcessReuse = false;

// No activity on GPU when enabled... but complex scenes are 1-3FPS
//app.commandLine.appendSwitch('disable-gpu-compositing');

// Same as above
//app.commandLine.appendSwitch('disable-gpu');

// Same as above
// app.disableHardwareAcceleration();

// Doesn't seem to do anything, but might fix a weird driver issue?
//app.commandLine.appendSwitch('disable-gpu-sandbox');
//app.commandLine.appendSwitch('--no-sandbox');

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'app',
        privileges: {secure: true, standard: true, supportFetchAPI: true}
    },
    {
        scheme: 'asset',
        privileges: { supportFetchAPI: true }
    }
]);

function createWindow() {

    // Establish the splash screen
    const splash = new BrowserWindow({width: 800, height: 500, transparent: true, frame: false, alwaysOnTop: true});
    Menu.setApplicationMenu(null);

    // Create the browser window.
    const win = new BrowserWindow({
        show: false,
        width: 1600,
        height: 900,
        minWidth: 1000,
        fullscreen: false,
        minimizable: true,
        resizeable: true,
        frame: false,
        title: 'Illuminations by MIT',
        icon: path.join(__dirname, 'build/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js'),
            devTools: false,
            additionalArguments: [userDataPath]
        }
    });

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        splash.loadURL(`file://${__dirname}/../public/splash.html`).catch(console.log);
        win.loadURL(`${process.env.WEBPACK_DEV_SERVER_URL}`).catch(console.log);
        win.webContents.openDevTools();
    } else {
        createProtocol('app');
        splash.loadURL(`app://./splash.html`).catch(console.log);
        win.loadURL(`app://./index.html`).catch(error => {
            throw new Error(error.message);
        });
    }

    win.webContents.once('did-finish-load', () => {
        splash.destroy();
        win.show();
    });
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
        app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    protocol.registerFileProtocol('asset', (request, callback) => {
        const pathname = decodeURI(request.url.replace('asset://', ''))
        try {
            const fullpath = getAssetPath(pathname);
            callback(fullpath);
        } catch (err) {
            console.error(err);
            callback(404);
        }
    });

    createWindow();
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit();
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit();
        })
    }
}
