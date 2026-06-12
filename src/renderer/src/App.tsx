import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  FolderOpen,
  Globe2,
  Info,
  Loader2,
  MonitorDot,
  RefreshCw,
  type LucideIcon
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ASSET_PRESETS,
  CUSTOM_SIZE_LIMITS,
  captureTargetSize,
  getAssetPreset,
  validateCaptureTarget,
  type AppLanguage,
  type AssetPreset,
  type AssetPresetId,
  type BrowserTab,
  type CaptureTarget,
  type CaptureResult,
  type ComplianceIssue,
  type ThemeState,
  type UrlScrollMode
} from '../../shared/types';
import {
  APP_COPY,
  complianceMessage,
  localizedError,
  localizedNote
} from './i18n';

type SourceMode = 'url' | 'browser';
type BusyState = 'idle' | 'capturing' | 'listing' | 'exporting';
type AssetSelection = AssetPresetId | 'custom';

const SOURCES: Array<{ id: SourceMode; icon: LucideIcon }> = [
  { id: 'browser', icon: MonitorDot },
  { id: 'url', icon: Globe2 }
];

const URL_SCROLL_MODES: UrlScrollMode[] = ['top', 'middle', 'bottom', 'custom'];
const UNIQUE_ASSET_PRESETS = ASSET_PRESETS.filter(
  (asset, index, presets) =>
    presets.findIndex((item) => item.width === asset.width && item.height === asset.height) === index
);

function defaultName(target: CaptureTarget): string {
  if (target.mode === 'preset') {
    const asset = getAssetPreset(target.assetId);
    return `${asset.storeId}-${asset.kind}-${asset.width}x${asset.height}.png`;
  }

  return `custom-${target.width}x${target.height}.png`;
}

function assetSelectLabel(language: AppLanguage, asset: AssetPreset): string {
  const dimensions = `${asset.width}x${asset.height}`;

  if (language === 'zh-CN') {
    if (asset.width === 440 && asset.height === 280) {
      return `宣传图 ${dimensions}`;
    }

    if (asset.width === 1400 && asset.height === 560) {
      return `横幅图 ${dimensions}`;
    }

    if (asset.width === 800 && asset.height === 600) {
      return `最大安全尺寸 ${dimensions}`;
    }

    return `截图 ${dimensions}`;
  }

  if (asset.width === 440 && asset.height === 280) {
    return `Promo image ${dimensions}`;
  }

  if (asset.width === 1400 && asset.height === 560) {
    return `Wide banner ${dimensions}`;
  }

  if (asset.width === 800 && asset.height === 600) {
    return `Max-safe size ${dimensions}`;
  }

  return `Screenshot ${dimensions}`;
}

function issueIcon(issue: ComplianceIssue) {
  if (issue.severity === 'error') {
    return <AlertTriangle size={15} />;
  }

  if (issue.severity === 'warning') {
    return <Info size={15} />;
  }

  return <CheckCircle2 size={15} />;
}

function PanelHeading({
  label,
  title,
  action
}: {
  label: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        {label !== title && <div className="panel-kicker">{label}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>('zh-CN');
  const [theme, setTheme] = useState<ThemeState>({ mode: 'system', resolved: 'light' });
  const [browserRuntimeMissing, setBrowserRuntimeMissing] = useState(false);
  const [source, setSource] = useState<SourceMode>('browser');
  const [assetId, setAssetId] = useState<AssetPresetId>('chrome-screenshot-1280x800');
  const [assetSelection, setAssetSelection] = useState<AssetSelection>('chrome-screenshot-1280x800');
  const [customWidth, setCustomWidth] = useState(1280);
  const [customHeight, setCustomHeight] = useState(800);
  const [url, setUrl] = useState('https://example.com');
  const [urlScrollMode, setUrlScrollMode] = useState<UrlScrollMode>('top');
  const [urlScrollY, setUrlScrollY] = useState(0);
  const [endpoint, setEndpoint] = useState('http://127.0.0.1:9222');
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState('');
  const [result, setResult] = useState<CaptureResult | undefined>();
  const [exportPath, setExportPath] = useState('');
  const [exportError, setExportError] = useState('');
  const [busy, setBusy] = useState<BusyState>('idle');
  const [error, setError] = useState('');
  const [status, setStatus] = useState(APP_COPY['zh-CN'].ready);
  const [copiedGuideCommand, setCopiedGuideCommand] = useState('');

  const t = APP_COPY[language];
  const isCustomTarget = assetSelection === 'custom';
  const activeTarget = useMemo<CaptureTarget>(
    () =>
      isCustomTarget
        ? { mode: 'custom', width: customWidth, height: customHeight }
        : { mode: 'preset', assetId },
    [assetId, customHeight, customWidth, isCustomTarget]
  );
  const activeSize = isCustomTarget ? { width: customWidth, height: customHeight } : captureTargetSize(activeTarget);
  const safePreviewWidth = Math.max(1, Number.isFinite(activeSize.width) ? activeSize.width : 1);
  const safePreviewHeight = Math.max(1, Number.isFinite(activeSize.height) ? activeSize.height : 1);
  const imageSrc = result?.previewDataUrl ?? '';
  const compliance = result?.compliance ?? [];
  const hasComplianceErrors = compliance.some((issue) => issue.severity === 'error');
  const canExport = Boolean(result?.imagePath) && !hasComplianceErrors;
  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === selectedTabId), [tabs, selectedTabId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme.resolved;
    document.documentElement.dataset.themeMode = theme.mode;
    document.documentElement.style.colorScheme = theme.resolved;
  }, [theme]);

  useEffect(() => {
    void window.storeShot.getLanguage().then((nextLanguage) => {
      setLanguage(nextLanguage);
      setStatus(APP_COPY[nextLanguage].ready);
    });

    void window.storeShot.getTheme().then(setTheme);
    void window.storeShot
      .getBrowserRuntime()
      .then((runtime) => setBrowserRuntimeMissing(!runtime))
      .catch(() => setBrowserRuntimeMissing(true));

    const removeLanguageListener = window.storeShot.onLanguageChanged((nextLanguage) => {
      setLanguage(nextLanguage);
      setStatus(APP_COPY[nextLanguage].ready);
    });
    const removeThemeListener = window.storeShot.onThemeChanged(setTheme);

    return () => {
      removeLanguageListener();
      removeThemeListener();
    };
  }, []);

  useEffect(() => {
    setResult(undefined);
    setExportPath('');
    setExportError('');
  }, [assetId, assetSelection, customHeight, customWidth]);

  async function run<T>(state: BusyState, task: () => Promise<T>): Promise<T | undefined> {
    setBusy(state);
    setError('');
    try {
      return await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(localizedError(language, message));
      setStatus(t.actionFailed);
      return undefined;
    } finally {
      setBusy('idle');
    }
  }

  async function captureWithResult(task: () => Promise<CaptureResult>) {
    const next = await run('capturing', task);
    if (next) {
      setResult(next);
      setExportPath('');
      setExportError('');
      setStatus(t.captured(next.width, next.height));
    }
  }

  function targetForAction(): CaptureTarget | undefined {
    try {
      const target = validateCaptureTarget(activeTarget);
      setError('');
      return target;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(localizedError(language, message));
      setStatus(t.actionFailed);
      return undefined;
    }
  }

  function handleAssetSelection(nextSelection: AssetSelection) {
    setAssetSelection(nextSelection);
    if (nextSelection !== 'custom') {
      setAssetId(nextSelection);
    }
  }

  function captureUrlSource() {
    const target = targetForAction();
    if (!target) {
      return;
    }

    void captureWithResult(() =>
      window.storeShot.captureUrl({
        url,
        target,
        options: {
          scrollMode: urlScrollMode,
          scrollY: urlScrollY
        }
      })
    );
  }

  function captureBrowser() {
    const target = targetForAction();
    if (!target) {
      return;
    }

    if (!selectedTabId) {
      setError(t.chooseTabFirst);
      return;
    }

    void captureWithResult(() => window.storeShot.captureBrowserTab({ endpoint, tabId: selectedTabId, target }));
  }

  async function refreshTabs() {
    const next = await run('listing', () => window.storeShot.listBrowserTabs({ endpoint }));
    if (next) {
      setTabs(next);
      setSelectedTabId(next[0]?.id ?? '');
      setStatus(t.foundTabs(next.length));
    }
  }

  async function exportPng() {
    if (!result) {
      setStatus(t.captureFirst);
      setExportError(t.captureFirst);
      return;
    }

    setExportError('');
    const destination = await window.storeShot.pickExportPath({
      defaultName: result.suggestedFileName ?? defaultName(result.target)
    });
    if (!destination) {
      return;
    }

    setExportPath('');
    setBusy('exporting');
    try {
      const exported = await window.storeShot.exportPng({
        sourceImagePath: result.imagePath,
        destinationPath: destination,
        target: result.target
      });
      setExportPath(exported.destinationPath);
      setStatus(t.pngExported);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setExportError(localizedError(language, message));
      setStatus(t.actionFailed);
    } finally {
      setBusy('idle');
    }
  }

  function showExportedFile() {
    if (exportPath) {
      void window.storeShot.showItemInFolder(exportPath);
    }
  }

  async function copyGuideCommand(command: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = command;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopiedGuideCommand(command);
      window.setTimeout(() => {
        setCopiedGuideCommand((current) => (current === command ? '' : current));
      }, 1600);
    } catch {
      setCopiedGuideCommand('');
    }
  }

  const showNativeBrowserWarning = browserRuntimeMissing && source === 'url';

  return (
    <main className="app-shell">
      <aside className="source-rail">
        <nav className="source-list" aria-label={t.captureSourceAria}>
          {SOURCES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={source === item.id ? 'source-button active' : 'source-button'}
                key={item.id}
                onClick={() => setSource(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{t.sourceLabels[item.id]}</span>
              </button>
            );
          })}
        </nav>

      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="toolbar-selects">
            <label className="topbar-select wide">
              {t.asset}
              <select
                value={assetSelection}
                onChange={(event) => handleAssetSelection(event.target.value as AssetSelection)}
              >
                <option value="custom">{t.customSize}</option>
                {UNIQUE_ASSET_PRESETS.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {assetSelectLabel(language, asset)}
                  </option>
                ))}
              </select>
            </label>

            {isCustomTarget && (
              <div className="custom-size-fields">
                <label className="compact-field">
                  {t.customWidth}
                  <input
                    max={CUSTOM_SIZE_LIMITS.max}
                    min={CUSTOM_SIZE_LIMITS.min}
                    onChange={(event) => setCustomWidth(Number(event.target.value))}
                    step={1}
                    type="number"
                    value={customWidth}
                  />
                </label>
                <label className="compact-field">
                  {t.customHeight}
                  <input
                    max={CUSTOM_SIZE_LIMITS.max}
                    min={CUSTOM_SIZE_LIMITS.min}
                    onChange={(event) => setCustomHeight(Number(event.target.value))}
                    step={1}
                    type="number"
                    value={customHeight}
                  />
                </label>
              </div>
            )}
          </div>

        </header>

        <div className="work-grid">
          <aside className="side-panel">
            <section className="control-panel panel" aria-label={t.captureSettings}>
              <PanelHeading label={t.captureSettings} title={t.captureSettings} />

              {source === 'url' && (
                <div className="stack">
                  <label>
                    {t.pageUrl}
                    <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
                  </label>
                  <label>
                    {t.pagePosition}
                    <select
                      value={urlScrollMode}
                      onChange={(event) => setUrlScrollMode(event.target.value as UrlScrollMode)}
                    >
                      {URL_SCROLL_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {t.urlScrollModeLabels[mode]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {urlScrollMode === 'custom' && (
                    <label>
                      {t.customScrollY}
                      <input
                        min={0}
                        onChange={(event) => setUrlScrollY(Math.max(0, Number(event.target.value) || 0))}
                        step={100}
                        type="number"
                        value={urlScrollY}
                      />
                    </label>
                  )}
                  <button className="primary" onClick={captureUrlSource} disabled={busy !== 'idle'} type="button">
                    {busy === 'capturing' ? <Loader2 className="spin" size={18} /> : <Camera size={18} />}
                    {t.capturePage}
                  </button>
                </div>
              )}

              {source === 'browser' && (
                <div className="stack">
                  <label>
                    {t.cdpEndpoint}
                    <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
                  </label>
                  <button className="secondary" onClick={refreshTabs} disabled={busy !== 'idle'} type="button">
                    {busy === 'listing' ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
                    {t.refreshTabs}
                  </button>
                  <label>
                    {t.tab}
                    <select value={selectedTabId} onChange={(event) => setSelectedTabId(event.target.value)}>
                      <option value="">{t.noTabSelected}</option>
                      {tabs.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                          {tab.title || tab.url}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedTab && <p className="tab-url">{selectedTab.url}</p>}
                  <button className="primary" onClick={captureBrowser} disabled={busy !== 'idle'} type="button">
                    <Camera size={18} />
                    {t.captureTab}
                  </button>
                </div>
              )}

              {error && <div className="error-box">{error}</div>}
              {!error && showNativeBrowserWarning && (
                <div className="error-box compact">{t.browserRuntimeMissing}</div>
              )}

              <section className="export-section">
                <button className="primary export-button" onClick={exportPng} disabled={!canExport || busy !== 'idle'}>
                  {busy === 'exporting' ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
                  {t.exportPng}
                </button>
                {exportPath && (
                  <div className="export-result-row">
                    <p className="export-result">{t.pngExported}</p>
                    <button className="link-button" onClick={showExportedFile} type="button">
                      <FolderOpen size={15} />
                      {t.openExportFolder}
                    </button>
                  </div>
                )}
                {exportError && <div className="error-box compact">{exportError}</div>}
              </section>

              {compliance.length > 0 && (
                <section className="export-section">
                  <div className="panel-kicker">{t.compliance}</div>
                  <div className="issue-list">
                    {compliance.map((issue) => (
                      <div className={`issue ${issue.severity}`} key={issue.ruleId}>
                        {issueIcon(issue)}
                        <span>{complianceMessage(language, issue)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </section>

            <section className="guide-panel panel" aria-label={t.operationGuide}>
              <PanelHeading label={t.operationGuide} title={t.operationGuide} />
              <ol className="guide-list">
                {t.sourceGuides[source].map((item, index) => {
                  const guideText = typeof item === 'string' ? item : item.text;
                  const command = typeof item === 'string' ? '' : item.copyText;

                  return (
                    <li className={command ? 'guide-command-item' : undefined} key={`${source}-${index}-${guideText}`}>
                      <span>{guideText}</span>
                      {command && (
                        <div className="guide-command-block">
                          <code>{command}</code>
                          <button
                            className="guide-copy-button"
                            onClick={() => void copyGuideCommand(command)}
                            title={t.copyCommand}
                            type="button"
                          >
                            {copiedGuideCommand === command ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                            <span>{copiedGuideCommand === command ? t.copied : t.copyCommand}</span>
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          </aside>

          <section className="preview-panel panel" aria-label={t.previewAria}>
            <PanelHeading
              label={t.previewTitle}
              title={t.previewTitle}
              action={
                <div className={result ? 'status-pill ok' : 'status-pill'}>
                  {result ? t.captureReady : t.pendingValidation}
                </div>
              }
            />
            <div className="preview-stage">
              <div className="preview-frame" style={{ aspectRatio: `${safePreviewWidth} / ${safePreviewHeight}` }}>
                {imageSrc ? (
                  <img src={imageSrc} alt={t.previewAlt} />
                ) : (
                  <div className="empty-preview">
                    <Camera size={38} />
                  </div>
                )}
              </div>
            </div>
            {result?.note && <p className="note">{localizedNote(language, result.note)}</p>}
            {result?.pagePosition && (
              <p className="note">
                {t.pagePosition}: {t.pagePositionSummary(result.pagePosition.scrollY, result.pagePosition.maxScrollY)}
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
