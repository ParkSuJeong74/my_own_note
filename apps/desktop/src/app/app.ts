import { getPublicConfig, PublicConfigInterface } from '@my_own_note/core';
import { BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'path';
import { format } from 'url';
import { environment } from '../environments/environment';
import { rendererAppName, rendererAppPort } from './constants';

export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  static mainWindow: Electron.BrowserWindow | null = null;
  static application: Electron.App;
  static BrowserWindow: typeof Electron.BrowserWindow;
  static appConfig: PublicConfigInterface;

  public static isDevelopmentMode() {
    const isEnvironmentSet: boolean = 'ELECTRON_IS_DEV' in process.env;
    const getFromEnvironment: boolean = parseInt(process.env.ELECTRON_IS_DEV || '0', 10) === 1;

    return isEnvironmentSet ? getFromEnvironment : !environment.production;
  }

  private static onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      App.application.quit();
    }
  }

  private static async onReady() {
    try {
      App.appConfig = await getPublicConfig();
      console.log('Config loaded:', App.appConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
    }

    App.setupIpcHandlers();

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    if (rendererAppName) {
      App.initMainWindow();
      App.loadMainWindow();
    }
  }

  private static setupIpcHandlers() {
    ipcMain.handle('get-config', async (event, key: string) => {
      const safeConfig = {
        service: App.appConfig.service,
      };

      if (!key) {
        return safeConfig;
      }

      if (key in safeConfig) {
        return safeConfig[key as keyof typeof safeConfig];
      }

      return null;
    });
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (App.mainWindow === null) {
      App.onReady();
    }
  }

  private static initMainWindow() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);

    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      show: false,
      webPreferences: {
        contextIsolation: true,
        backgroundThrottling: false,
        preload: join(__dirname, 'main.preload.js'),
      },
    });
    App.mainWindow.setMenu(null);
    App.mainWindow.center();

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      if (App.mainWindow) {
        App.mainWindow.show();

        App.mainWindow.webContents.send('app-config', {
          apiPort: App.appConfig.service.api.port,
          desktopPort: App.appConfig.service.desktop.port,
          webPort: App.appConfig.service.web.port,
        });
      }
    });

    // Emitted when the window is closed.
    App.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      App.mainWindow = null;
    });
  }

  private static loadMainWindow() {
    // load the index.html of the app.
    if (!App.mainWindow) return; // null 체크 추가

    if (!App.application.isPackaged) {
      const webPort = App.appConfig?.service?.web?.port || rendererAppPort;
      App.mainWindow.loadURL(`http://localhost:${webPort}`);
    } else {
      App.mainWindow.loadURL(
        format({
          pathname: join(__dirname, '..', rendererAppName, 'index.html'),
          protocol: 'file:',
          slashes: true,
        })
      );
    }
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for

    App.BrowserWindow = browserWindow;
    App.application = app;

    App.application.on('window-all-closed', App.onWindowAllClosed); // Quit when all windows are closed.
    App.application.on('ready', App.onReady); // App is ready to load data
    App.application.on('activate', App.onActivate); // App is activated
  }
}
