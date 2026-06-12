import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell, type MenuItemConstructorOptions } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type AppLanguage,
  type CaptureTarget,
  type ThemeMode,
  type ThemeState,
  type UrlCaptureOptions
} from '../shared/types';
import { findBrowserRuntime } from './browserRuntime';
import {
  captureBrowserTab,
  captureExtensionOptions,
  captureExtensionPopup,
  captureUrl,
  listBrowserTabs
} from './capture';
import { hasBlockingComplianceIssue, validateImageCompliance } from './compliance';
import { copyPng } from './image';
import { readExtensionManifest } from './manifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let appLanguage: AppLanguage = 'zh-CN';
let themeMode: ThemeMode = 'system';

type AppSettings = {
  themeMode?: ThemeMode;
};

const MENU_TEXT: Record<
  AppLanguage,
  {
    title: string;
    exportPng: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    language: string;
    zhCn: string;
    enUs: string;
    aboutMenu: string;
    about: string;
    aboutDetail: string;
    chooseExtensionDirectory: string;
  }
> = {
  'zh-CN': {
    title: 'Web 扩展商店截图工具',
    exportPng: '导出 PNG',
    theme: '主题',
    themeLight: '亮色',
    themeDark: '暗色',
    themeSystem: '跟随系统',
    language: '语言',
    zhCn: '简体中文',
    enUs: 'English',
    aboutMenu: '关于',
    about: '关于 Web 扩展商店截图工具',
    aboutDetail:
      '这是一个面向 Web 扩展开发者的商店截图与 PNG 导出工具。\n\n作者：Un1quer\nGitHub：https://github.com/Un1quer23/web-extension-store-screenshot-tool',
    chooseExtensionDirectory: '选择未打包扩展目录'
  },
  'en-US': {
    title: 'Web Extension Store Screenshot Tool',
    exportPng: 'Export PNG',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    language: 'Language',
    zhCn: '简体中文',
    enUs: 'English',
    aboutMenu: 'About',
    about: 'About Web Extension Store Screenshot Tool',
    aboutDetail:
      'A store screenshot and PNG export tool for Web extension developers.\n\nAuthor: Un1quer\nGitHub: https://github.com/Un1quer23/web-extension-store-screenshot-tool',
    chooseExtensionDirectory: 'Choose unpacked extension directory'
  }
};

function t() {
  return MENU_TEXT[appLanguage];
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'zh-CN' || value === 'en-US';
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings(): void {
  const filePath = settingsPath();
  if (!existsSync(filePath)) {
    return;
  }

  try {
    const settings = JSON.parse(readFileSync(filePath, 'utf8')) as AppSettings;
    if (isThemeMode(settings.themeMode)) {
      themeMode = settings.themeMode;
    }
  } catch {
    themeMode = 'system';
  }
}

function saveSettings(): void {
  mkdirSync(app.getPath('userData'), { recursive: true });
  writeFileSync(settingsPath(), `${JSON.stringify({ themeMode }, null, 2)}\n`);
}

function themeState(): ThemeState {
  return {
    mode: themeMode,
    resolved: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  };
}

function broadcastTheme(): ThemeState {
  const state = themeState();
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('app:themeChanged', state);
  }

  return state;
}

function applyTheme(nextThemeMode: ThemeMode, persist = true): ThemeState {
  themeMode = nextThemeMode;
  nativeTheme.themeSource = nextThemeMode;
  if (persist) {
    saveSettings();
  }

  return broadcastTheme();
}

function applyLanguage(nextLanguage: AppLanguage): AppLanguage {
  appLanguage = nextLanguage;
  setupApplicationMenu();

  for (const window of BrowserWindow.getAllWindows()) {
    window.setTitle(t().title);
    window.webContents.send('app:languageChanged', appLanguage);
  }

  return appLanguage;
}

function appIconPath(): string | undefined {
  const candidate = path.join(app.getAppPath(), 'build', 'icon.ico');
  return existsSync(candidate) ? candidate : undefined;
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#16181d' : '#f5f5f7',
    icon: appIconPath(),
    title: t().title,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function setupApplicationMenu(): void {
  const labels = t();
  const showMessage = (title: string, message: string, detail: string) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const options = {
      type: 'info',
      title,
      message,
      detail,
      icon: appIconPath()
    } as const;

    if (focusedWindow) {
      void dialog.showMessageBox(focusedWindow, options);
    } else {
      void dialog.showMessageBox(options);
    }
  };

  const template: MenuItemConstructorOptions[] = [
    {
      label: labels.theme,
      submenu: [
        {
          label: labels.themeLight,
          type: 'radio',
          checked: themeMode === 'light',
          click: () => applyTheme('light')
        },
        {
          label: labels.themeDark,
          type: 'radio',
          checked: themeMode === 'dark',
          click: () => applyTheme('dark')
        },
        {
          label: labels.themeSystem,
          type: 'radio',
          checked: themeMode === 'system',
          click: () => applyTheme('system')
        }
      ]
    },
    {
      label: labels.language,
      submenu: [
        {
          label: labels.zhCn,
          type: 'radio',
          checked: appLanguage === 'zh-CN',
          click: () => applyLanguage('zh-CN')
        },
        {
          label: labels.enUs,
          type: 'radio',
          checked: appLanguage === 'en-US',
          click: () => applyLanguage('en-US')
        }
      ]
    },
    {
      label: labels.aboutMenu,
      submenu: [
        {
          label: labels.about,
          click: () => showMessage(labels.about, `${labels.title} ${app.getVersion()}`, labels.aboutDetail)
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerHandlers(): void {
  ipcMain.handle(
    'capture:url',
    (_event, payload: { url: string; target: CaptureTarget; options?: Partial<UrlCaptureOptions> }) =>
      captureUrl(payload.url, payload.target, payload.options)
  );
  ipcMain.handle('capture:extensionOptions', (_event, payload: { extensionPath: string; target: CaptureTarget }) =>
    captureExtensionOptions(payload.extensionPath, payload.target)
  );
  ipcMain.handle('capture:extensionPopup', (_event, payload: { extensionPath: string; target: CaptureTarget }) =>
    captureExtensionPopup(payload.extensionPath, payload.target)
  );
  ipcMain.handle('extension:inspectManifest', (_event, payload: { extensionPath: string }) =>
    readExtensionManifest(payload.extensionPath)
  );
  ipcMain.handle('browser:listTabs', (_event, payload: { endpoint: string }) => listBrowserTabs(payload.endpoint));
  ipcMain.handle('capture:browserTab', (_event, payload: { endpoint: string; tabId: string; target: CaptureTarget }) =>
    captureBrowserTab(payload.endpoint, payload.tabId, payload.target)
  );
  ipcMain.handle(
    'export:png',
    async (_event, payload: { sourceImagePath: string; destinationPath: string; target: CaptureTarget }) => {
      const compliance = await validateImageCompliance(payload.sourceImagePath, payload.target);
      if (hasBlockingComplianceIssue(compliance)) {
        throw new Error(compliance.filter((issue) => issue.severity === 'error').map((issue) => issue.message).join(' '));
      }

      const destinationPath = await copyPng(payload.sourceImagePath, payload.destinationPath);
      return { destinationPath, compliance };
    }
  );
  ipcMain.handle('dialog:pickExtensionDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: t().chooseExtensionDirectory,
      properties: ['openDirectory']
    });

    return result.canceled ? undefined : result.filePaths[0];
  });
  ipcMain.handle('dialog:pickExportPath', async (_event, payload: { defaultName: string }) => {
    const result = await dialog.showSaveDialog({
      title: t().exportPng,
      defaultPath: payload.defaultName,
      filters: [{ name: 'PNG image', extensions: ['png'] }]
    });

    return result.canceled ? undefined : result.filePath;
  });
  ipcMain.handle('shell:showItemInFolder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });
  ipcMain.handle('app:getLanguage', () => appLanguage);
  ipcMain.handle('app:setLanguage', (_event, language: AppLanguage) => {
    if (!isAppLanguage(language)) {
      throw new Error(`Unsupported language: ${String(language)}`);
    }

    return applyLanguage(language);
  });
  ipcMain.handle('app:getTheme', () => themeState());
  ipcMain.handle('app:setTheme', (_event, mode: ThemeMode) => {
    if (!isThemeMode(mode)) {
      throw new Error(`Unsupported theme: ${String(mode)}`);
    }

    return applyTheme(mode);
  });
  ipcMain.handle('app:getBrowserRuntime', () => findBrowserRuntime());
}

app.whenReady().then(() => {
  loadSettings();
  applyTheme(themeMode, false);
  setupApplicationMenu();
  registerHandlers();
  createWindow();

  nativeTheme.on('updated', () => {
    broadcastTheme();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
