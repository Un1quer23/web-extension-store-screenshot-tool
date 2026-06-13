import os from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
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
import { outputPath } from './naming';
import { requireBrowserRuntime } from './browserRuntime';

const OUTPUT_DIR = path.join(os.tmpdir(), 'web-extension-store-screenshot-tool');

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

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

type DebugTarget = {
  title?: string;
  type?: string;
  url?: string;
};

function debugListUrl(endpoint: string): string | undefined {
  try {
    const url = new URL(endpoint.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }

    return new URL('/json/list', url).toString();
  } catch {
    return undefined;
  }
}

async function browserDebugTargets(endpoint: string): Promise<DebugTarget[]> {
  const url = debugListUrl(endpoint);
  if (!url) {
    return [];
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const targets = (await response.json()) as DebugTarget[];
        if (targets.some((target) => target.type === 'page' && target.url && target.title?.trim())) {
          return targets;
        }
      }
    } catch {
      // The debug endpoint can be reachable before its target list is fully populated.
    }

    await sleep(100);
  }

  return [];
}

function debugTitlesByUrl(targets: DebugTarget[]): Map<string, string[]> {
  const titles = new Map<string, string[]>();

  for (const target of targets) {
    const url = target.url?.trim();
    const title = target.title?.trim();
    if (target.type !== 'page' || !url || !title) {
      continue;
    }

    titles.set(url, [...(titles.get(url) ?? []), title]);
  }

  return titles;
}

function takeDebugTitle(titles: Map<string, string[]>, url: string): string {
  const candidates = titles.get(url);
  return candidates?.shift() ?? '';
}

async function pageDisplayTitle(page: Page, debugTitle = ''): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.waitForLoadState('domcontentloaded', { timeout: 100 }).catch(() => undefined);

    const domTitle = (await page.title().catch(() => '')).trim();
    if (domTitle) {
      return domTitle;
    }

    if (debugTitle) {
      return debugTitle;
    }

    await sleep(100);
  }

  return '';
}

export async function listBrowserTabs(endpoint: string): Promise<BrowserTab[]> {
  const browser = await connect(endpoint);

  try {
    const tabs = flattenPages(browser.contexts()).filter(({ page }) => page.url() !== 'about:blank');
    const debugTitles = debugTitlesByUrl(await browserDebugTargets(endpoint));
    return Promise.all(
      tabs.map(async ({ id, page }) => ({
        id,
        title: await pageDisplayTitle(page, takeDebugTitle(debugTitles, page.url())),
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
