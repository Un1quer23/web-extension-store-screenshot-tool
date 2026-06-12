import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  AppLanguage,
  BrowserRuntime,
  BrowserTab,
  CaptureTarget,
  CaptureResult,
  ComplianceIssue,
  ExtensionManifestInfo,
  ThemeMode,
  ThemeState,
  UrlCaptureOptions
} from '../shared/types';

const api = {
  captureUrl: (payload: { url: string; target: CaptureTarget; options?: Partial<UrlCaptureOptions> }): Promise<CaptureResult> =>
    ipcRenderer.invoke('capture:url', payload),
  captureExtensionOptions: (payload: { extensionPath: string; target: CaptureTarget }): Promise<CaptureResult> =>
    ipcRenderer.invoke('capture:extensionOptions', payload),
  captureExtensionPopup: (payload: { extensionPath: string; target: CaptureTarget }): Promise<CaptureResult> =>
    ipcRenderer.invoke('capture:extensionPopup', payload),
  inspectExtensionManifest: (payload: { extensionPath: string }): Promise<ExtensionManifestInfo> =>
    ipcRenderer.invoke('extension:inspectManifest', payload),
  listBrowserTabs: (payload: { endpoint: string }): Promise<BrowserTab[]> =>
    ipcRenderer.invoke('browser:listTabs', payload),
  captureBrowserTab: (payload: { endpoint: string; tabId: string; target: CaptureTarget }): Promise<CaptureResult> =>
    ipcRenderer.invoke('capture:browserTab', payload),
  exportPng: (payload: {
    sourceImagePath: string;
    destinationPath: string;
    target: CaptureTarget;
  }): Promise<{ destinationPath: string; compliance: ComplianceIssue[] }> => ipcRenderer.invoke('export:png', payload),
  pickExtensionDirectory: (): Promise<string | undefined> => ipcRenderer.invoke('dialog:pickExtensionDirectory'),
  pickExportPath: (payload: { defaultName: string }): Promise<string | undefined> =>
    ipcRenderer.invoke('dialog:pickExportPath', payload),
  showItemInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  getLanguage: (): Promise<AppLanguage> => ipcRenderer.invoke('app:getLanguage'),
  setLanguage: (language: AppLanguage): Promise<AppLanguage> => ipcRenderer.invoke('app:setLanguage', language),
  getTheme: (): Promise<ThemeState> => ipcRenderer.invoke('app:getTheme'),
  setTheme: (mode: ThemeMode): Promise<ThemeState> => ipcRenderer.invoke('app:setTheme', mode),
  getBrowserRuntime: (): Promise<BrowserRuntime | undefined> => ipcRenderer.invoke('app:getBrowserRuntime'),
  onLanguageChanged: (callback: (language: AppLanguage) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, language: AppLanguage) => callback(language);
    ipcRenderer.on('app:languageChanged', listener);
    return () => ipcRenderer.off('app:languageChanged', listener);
  },
  onThemeChanged: (callback: (theme: ThemeState) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, theme: ThemeState) => callback(theme);
    ipcRenderer.on('app:themeChanged', listener);
    return () => ipcRenderer.off('app:themeChanged', listener);
  }
};

contextBridge.exposeInMainWorld('storeShot', api);

export type StoreShotApi = typeof api;
