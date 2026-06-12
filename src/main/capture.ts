import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext, type Page, type Worker } from 'playwright';
import {
  captureTargetSize,
  type AssetPresetId,
  type BrowserTab,
  type CaptureTarget,
  type CaptureResult,
  type PagePositionInfo,
  type UrlCaptureOptions
} from '../shared/types';
import { validateImageCompliance } from './compliance';
import { pngDataUrlFromFile, writePng } from './image';
import { readExtensionManifest } from './manifest';
import { outputPath } from './naming';
import { requireBrowserRuntime } from './browserRuntime';

const OUTPUT_DIR = path.join(os.tmpdir(), 'web-extension-store-screenshot-tool');
const INJECTED_BACKGROUND = '__store_shot_background.js';

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Please enter a URL to capture.');
  }

  if (/^(https?|file):\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

async function waitForPageIdle(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
}

function presetTarget(assetId: AssetPresetId): CaptureTarget {
  return { mode: 'preset', assetId };
}

async function buildCaptureResult(imagePath: string, target: CaptureTarget): Promise<CaptureResult> {
  const size = captureTargetSize(target);
  return {
    imagePath,
    previewDataUrl: await pngDataUrlFromFile(imagePath),
    suggestedFileName: path.basename(imagePath),
    width: size.width,
    height: size.height,
    assetId: target.mode === 'preset' ? target.assetId : undefined,
    target,
    compliance: await validateImageCompliance(imagePath, target)
  };
}

function defaultUrlCaptureOptions(options?: Partial<UrlCaptureOptions>): UrlCaptureOptions {
  return {
    scrollMode: options?.scrollMode ?? 'top',
    scrollY: Math.max(0, Math.round(options?.scrollY ?? 0))
  };
}

async function scrollPageForCapture(page: Page, options?: Partial<UrlCaptureOptions>): Promise<PagePositionInfo> {
  const captureOptions = defaultUrlCaptureOptions(options);

  return page.evaluate((nextOptions) => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    const maxScrollY = Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
    let targetY = 0;

    if (nextOptions.scrollMode === 'middle') {
      targetY = Math.round(maxScrollY / 2);
    } else if (nextOptions.scrollMode === 'bottom') {
      targetY = maxScrollY;
    } else if (nextOptions.scrollMode === 'custom') {
      targetY = nextOptions.scrollY;
    }

    const scrollY = Math.max(0, Math.min(maxScrollY, targetY));
    window.scrollTo(0, scrollY);

    return {
      scrollMode: nextOptions.scrollMode,
      scrollY: Math.round(window.scrollY),
      maxScrollY
    };
  }, captureOptions);
}

export async function captureUrl(
  url: string,
  target: AssetPresetId | CaptureTarget,
  options?: Partial<UrlCaptureOptions>
): Promise<CaptureResult> {
  const captureTarget = typeof target === 'string' ? presetTarget(target) : target;
  const size = captureTargetSize(captureTarget);
  const runtime = requireBrowserRuntime();
  const browser = await chromium.launch({ executablePath: runtime.executablePath });

  try {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
    await page.goto(normalizeUrl(url), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitForPageIdle(page);
    const pagePosition = await scrollPageForCapture(page, options);
    await page.waitForTimeout(150);
    const imagePath = outputPath(OUTPUT_DIR, 'url', captureTarget);
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    await writePng(buffer, imagePath);
    const result = await buildCaptureResult(imagePath, captureTarget);

    return {
      ...result,
      pagePosition,
      note: `Captured page at scroll Y ${pagePosition.scrollY} of ${pagePosition.maxScrollY}.`
    };
  } finally {
    await browser.close();
  }
}

async function detectExtensionId(context: BrowserContext): Promise<string> {
  let serviceWorker: Worker | undefined = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 5_000 }).catch(() => undefined);
  }

  const url = serviceWorker?.url();
  const match = url?.match(/^chrome-extension:\/\/([^/]+)/);
  if (!match) {
    throw new Error('Unable to detect the extension ID. Make sure the unpacked extension can start in Chromium.');
  }

  return match[1];
}

async function prepareExtensionForCapture(extensionPath: string): Promise<{ extensionPath: string; tempDir: string }> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'store-shot-extension-'));
  const preparedPath = path.join(tempDir, 'extension');
  await cp(extensionPath, preparedPath, { recursive: true });

  const manifestPath = path.join(preparedPath, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    manifest_version?: number;
    background?: {
      service_worker?: string;
      scripts?: string[];
      page?: string;
    };
  };

  const hasBackground =
    Boolean(manifest.background?.service_worker) ||
    Boolean(manifest.background?.page) ||
    Boolean(manifest.background?.scripts?.length);

  if (!hasBackground) {
    await writeFile(path.join(preparedPath, INJECTED_BACKGROUND), 'chrome.runtime.onInstalled.addListener(() => {});\n');

    if (manifest.manifest_version === 2) {
      manifest.background = { scripts: [INJECTED_BACKGROUND] };
    } else {
      manifest.background = { service_worker: INJECTED_BACKGROUND };
    }

    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return { extensionPath: preparedPath, tempDir };
}

async function withExtensionContext<T>(
  extensionPath: string,
  target: CaptureTarget,
  run: (context: BrowserContext, extensionId: string) => Promise<T>
): Promise<T> {
  const size = captureTargetSize(target);
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'store-shot-profile-'));
  const prepared = await prepareExtensionForCapture(extensionPath);
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: requireBrowserRuntime().executablePath,
    headless: false,
    viewport: size,
    deviceScaleFactor: 1,
    args: [
      `--disable-extensions-except=${prepared.extensionPath}`,
      `--load-extension=${prepared.extensionPath}`,
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const extensionId = await detectExtensionId(context);
    return await run(context, extensionId);
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
    await rm(prepared.tempDir, { recursive: true, force: true });
  }
}

async function captureExtensionPage(
  extensionPath: string,
  target: AssetPresetId | CaptureTarget,
  pageKind: 'options' | 'popup'
): Promise<CaptureResult> {
  const captureTarget = typeof target === 'string' ? presetTarget(target) : target;
  const manifest = await readExtensionManifest(extensionPath);
  const detectedPath = pageKind === 'options' ? manifest.optionsPath : manifest.popupPath;

  if (!detectedPath) {
    throw new Error(
      pageKind === 'options'
        ? 'manifest.json does not define an options page.'
        : 'manifest.json does not define a popup page.'
    );
  }

  const size = captureTargetSize(captureTarget);

  return withExtensionContext(extensionPath, captureTarget, async (context, extensionId) => {
    const page = await context.newPage();
    await page.setViewportSize(size);
    await page.goto(`chrome-extension://${extensionId}/${detectedPath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000
    });
    await waitForPageIdle(page);

    const imagePath = outputPath(OUTPUT_DIR, `extension-${pageKind}`, captureTarget);
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    await writePng(buffer, imagePath);
    const result = await buildCaptureResult(imagePath, captureTarget);

    return {
      ...result,
      detectedPath
    };
  });
}

export function captureExtensionOptions(extensionPath: string, target: AssetPresetId | CaptureTarget): Promise<CaptureResult> {
  return captureExtensionPage(extensionPath, target, 'options');
}

export function captureExtensionPopup(extensionPath: string, target: AssetPresetId | CaptureTarget): Promise<CaptureResult> {
  return captureExtensionPage(extensionPath, target, 'popup');
}

async function connect(endpoint: string) {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new Error('Please enter the browser remote debugging endpoint.');
  }

  return chromium.connectOverCDP(trimmed);
}

function flattenPages(contexts: BrowserContext[]): Array<{ id: string; page: Page }> {
  return contexts.flatMap((context, contextIndex) =>
    context.pages().map((page, pageIndex) => ({
      id: `${contextIndex}:${pageIndex}`,
      page
    }))
  );
}

export async function listBrowserTabs(endpoint: string): Promise<BrowserTab[]> {
  const browser = await connect(endpoint);

  try {
    const tabs = flattenPages(browser.contexts()).filter(({ page }) => page.url() !== 'about:blank');
    return Promise.all(
      tabs.map(async ({ id, page }) => ({
        id,
        title: (await page.title().catch(() => 'Untitled tab')) || 'Untitled tab',
        url: page.url()
      }))
    );
  } finally {
    await browser.close();
  }
}

export async function captureBrowserTab(
  endpoint: string,
  tabId: string,
  target: AssetPresetId | CaptureTarget
): Promise<CaptureResult> {
  const captureTarget = typeof target === 'string' ? presetTarget(target) : target;
  const size = captureTargetSize(captureTarget);
  const browser = await connect(endpoint);

  try {
    const selected = flattenPages(browser.contexts()).find((tab) => tab.id === tabId);
    if (!selected) {
      throw new Error('The selected browser tab was not found. Refresh the tab list and try again.');
    }

    await selected.page.bringToFront().catch(() => undefined);
    await selected.page.setViewportSize(size);
    await selected.page.waitForTimeout(300);

    const imagePath = outputPath(OUTPUT_DIR, 'browser-tab', captureTarget);
    const buffer = await selected.page.screenshot({ type: 'png', fullPage: false });
    await writePng(buffer, imagePath);
    const result = await buildCaptureResult(imagePath, captureTarget);

    return {
      ...result,
      note: 'The selected browser tab viewport was resized to the target asset before capture.'
    };
  } finally {
    await browser.close();
  }
}
