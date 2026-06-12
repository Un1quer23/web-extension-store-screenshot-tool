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
const ABOUT_GITHUB_URL = 'https://github.com/Un1quer23/web-extension-store-screenshot-tool';
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
    aboutIntro: string;
    author: string;
    github: string;
    openSourceNotice: string;
    watermark: string;
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
    aboutIntro: '这是一个面向 Web 扩展开发者的商店截图与 PNG 导出工具。',
    author: '作者：Un1quer',
    github: 'GitHub 项目地址',
    openSourceNotice: '本程序为开源软件，遵循 GNU General Public License v3 协议。',
    watermark: 'Think Different.',
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
    aboutIntro: 'A store screenshot and PNG export tool for Web extension developers.',
    author: 'Author: Un1quer',
    github: 'GitHub project',
    openSourceNotice: 'This program is open source software licensed under GNU General Public License v3.',
    watermark: 'Think Different.',
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function aboutHtml(labels: ReturnType<typeof t>): string {
  return `<!doctype html>
<html lang="${appLanguage === 'zh-CN' ? 'zh-CN' : 'en'}">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light dark" />
    <style>
      :root {
        color-scheme: light dark;
        font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
        background: #f7f7f7;
        color: #1b1b1b;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          background: #202020;
          color: #f3f3f3;
        }
      }

      * {
        box-sizing: border-box;
      }

      body {
        display: grid;
        min-height: 100vh;
        margin: 0;
        padding: 28px;
      }

      main {
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 18px;
        min-height: 0;
      }

      h1,
      p {
        margin: 0;
      }

      h1 {
        font-size: 20px;
        line-height: 1.28;
        font-weight: 650;
      }

      .version {
        color: color-mix(in srgb, currentColor 62%, transparent);
        font-size: 12px;
        font-weight: 500;
      }

      .content {
        display: grid;
        align-content: start;
        gap: 12px;
        font-size: 13px;
        line-height: 1.55;
        user-select: text;
      }

      a {
        color: #0067c0;
        text-decoration: none;
        overflow-wrap: anywhere;
      }

      a:hover {
        text-decoration: underline;
      }

      .notice {
        color: color-mix(in srgb, currentColor 76%, transparent);
      }

      .watermark {
        align-self: end;
        color: color-mix(in srgb, currentColor 58%, transparent);
        font-size: 12px;
        font-style: italic;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>${escapeHtml(labels.title)}</h1>
        <p class="version">v${escapeHtml(app.getVersion())}</p>
      </header>
      <section class="content">
        <p>${escapeHtml(labels.aboutIntro)}</p>
        <p>${escapeHtml(labels.author)}</p>
        <p>${escapeHtml(labels.github)}：<a href="${ABOUT_GITHUB_URL}" target="_blank" rel="noreferrer">${ABOUT_GITHUB_URL}</a></p>
        <p class="notice">${escapeHtml(labels.openSourceNotice)}</p>
      </section>
      <div></div>
      <p class="watermark">${escapeHtml(labels.watermark)}</p>
    </main>
  </body>
</html>`;
}

function showAboutWindow(): void {
  const labels = t();
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const aboutWindow = new BrowserWindow({
    width: 560,
    height: 360,
    minWidth: 480,
    minHeight: 320,
    maxWidth: 720,
    maxHeight: 520,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: focusedWindow ?? undefined,
    modal: Boolean(focusedWindow),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#202020' : '#f7f7f7',
    icon: appIconPath(),
    title: labels.about,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  aboutWindow.setMenu(null);
  aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });
  aboutWindow.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  void aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(aboutHtml(labels))}`);
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
          click: () => showAboutWindow()
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
