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
