/**
 * Created by JiaHao on 4/7/15.
 */

var fs = require('fs');
var os = require('os');
var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var shell = electron.shell;

var buildMenu = require('./buildMenu');

const APP_ARGS_FILE_PATH = __dirname + '/nativefier.json';

var mainWindow = null;

var appArgs = JSON.parse(fs.readFileSync(APP_ARGS_FILE_PATH, 'utf8'));

app.on('window-all-closed', function () {
    if (!isOSX()) {
        app.quit();
    }
});

app.on('activate', function (event, hasVisibleWindows) {
    if (isOSX()) {
        // this is called when the dock is clicked
        if (!hasVisibleWindows) {
            mainWindow.show();
        }
    }
});

app.on('before-quit', () => {
    // not fired when the close button on the window is clicked
    if (isOSX()) {
        // need to force a quit as a workaround here to simulate the osx app hiding behaviour
        // Somehow sokution at https://github.com/atom/electron/issues/444#issuecomment-76492576 does not work,
        // e.prevent default appears to persist

        // might cause issues in the future as before-quit and will-quit events are not called
        app.exit(0);
    }
});

app.on('ready', function () {
    mainWindow = new BrowserWindow(
        {
            width: appArgs.width || 1280,
            height: appArgs.height || 800,
            'web-preferences': {
                javascript: true,
                plugins: true,
                nodeIntegration: false,
                preload: __dirname + '/assets/js/index.js'
            }
        }
    );

    buildMenu(mainWindow, appArgs.nativefierVersion, app.quit);

    if (appArgs.userAgent) {
        mainWindow.webContents.setUserAgent(appArgs.userAgent);
    }

    mainWindow.webContents.on('did-finish-load', function () {
        mainWindow.webContents.send('params', JSON.stringify(appArgs));
    });

    mainWindow.on('page-title-updated', function () {
        if (isOSX() && !mainWindow.isFocused()) {
            app.dock.setBadge('●');
        }
    });

    mainWindow.webContents.on('new-window', function (event, url) {
        event.preventDefault();
        shell.openExternal(url);
    });

    mainWindow.loadURL(appArgs.targetUrl);
    // if the window is focused, clear the badge
    mainWindow.on('focus', function () {
        if (isOSX()) {
            app.dock.setBadge('');
        }
    });

    mainWindow.on('close', (e) => {
        if (isOSX()) {
            // this is called when exiting from clicking the cross button on the window
            e.preventDefault();
            mainWindow.hide();
        }
    });
});

function isOSX() {
    return os.platform() === 'darwin';
}
