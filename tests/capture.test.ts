import { createServer } from 'node:http';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureBrowserTab, captureExtensionOptions, captureExtensionPopup, captureUrl, listBrowserTabs } from '../src/main/capture';
import { requireBrowserRuntime } from '../src/main/browserRuntime';
import type { AssetPresetId } from '../src/shared/types';

let serverUrl = '';
let closeServer: (() => Promise<void>) | undefined;

beforeAll(async () => {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    if (request.url?.startsWith('/long')) {
      response.end(`
        <!doctype html>
        <html>
          <body style="margin:0;font-family:Segoe UI,sans-serif">
            <section style="height:600px;background:#f7f2e8;display:grid;place-items:center">Top</section>
            <section style="height:600px;background:#d8ead2;display:grid;place-items:center">Middle</section>
            <section style="height:600px;background:#d2e0f0;display:grid;place-items:center">Bottom</section>
          </body>
        </html>
      `);
      return;
    }

    response.end(`
      <!doctype html>
      <html>
        <body style="margin:0;background:#f7f2e8;color:#10201a;font-family:Segoe UI,sans-serif">
          <main style="height:100vh;display:grid;place-items:center">
            <h1>Store screenshot fixture</h1>
          </main>
        </body>
      </html>
    `);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to start fixture server.');
  }

  serverUrl = `http://127.0.0.1:${address.port}`;
  closeServer = () => new Promise((resolve) => server.close(() => resolve()));
});

afterAll(async () => {
  await closeServer?.();
});

async function expectPngSize(imagePath: string, width: number, height: number) {
  const metadata = await sharp(await readFile(imagePath)).metadata();
  expect(metadata.width).toBe(width);
  expect(metadata.height).toBe(height);
}

async function waitForCdpEndpoint(userDataDir: string): Promise<string> {
  const activePortPath = path.join(userDataDir, 'DevToolsActivePort');

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (existsSync(activePortPath)) {
      const [port] = (await readFile(activePortPath, 'utf8')).trim().split(/\r?\n/);
      if (port) {
        return `http://127.0.0.1:${port}`;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for a remote debugging endpoint.');
}

function stopBrowser(process: ChildProcessWithoutNullStreams): Promise<void> {
  if (process.killed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    process.once('exit', () => resolve());
    process.kill();
    setTimeout(resolve, 2_000).unref();
  });
}

describe('captureUrl', () => {
  it.each([
    ['chrome-screenshot-1280x800', 1280, 800],
    ['edge-screenshot-640x480', 640, 480],
    ['chrome-small-promo-440x280', 440, 280],
    ['opera-screenshot-612x408', 612, 408]
  ] satisfies Array<[AssetPresetId, number, number]>)(
    'captures %s at the preset viewport',
    async (assetId, width, height) => {
      const result = await captureUrl(serverUrl, assetId);
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(result.assetId).toBe(assetId);
      expect(result.compliance.some((issue) => issue.severity === 'error')).toBe(false);
      await expectPngSize(result.imagePath, width, height);
    },
    60_000
  );

  it('captures a scrolled part of a long page', async () => {
    const result = await captureUrl(`${serverUrl}/long`, 'edge-screenshot-640x480', { scrollMode: 'bottom', scrollY: 0 });

    expect(result.pagePosition?.maxScrollY).toBeGreaterThan(0);
    expect(result.pagePosition?.scrollY).toBe(result.pagePosition?.maxScrollY);
    await expectPngSize(result.imagePath, 640, 480);
  }, 60_000);

  it('captures a custom viewport size', async () => {
    const result = await captureUrl(serverUrl, { mode: 'custom', width: 390, height: 844 });

    expect(result.width).toBe(390);
    expect(result.height).toBe(844);
    expect(result.assetId).toBeUndefined();
    expect(result.target).toEqual({ mode: 'custom', width: 390, height: 844 });
    expect(result.compliance).toEqual([]);
    expect(path.basename(result.imagePath)).toMatch(/^custom-390x844-url-\d{8}-\d{6}\.png$/);
    await expectPngSize(result.imagePath, 390, 844);
  }, 60_000);

  it('captures a custom viewport size from an existing browser over CDP', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'store-shot-cdp-profile-'));
    const runtime = requireBrowserRuntime();
    const browserProcess = spawn(runtime.executablePath, [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      serverUrl
    ]);

    try {
      const endpoint = await waitForCdpEndpoint(userDataDir);
      const tabs = await listBrowserTabs(endpoint);
      const tab = tabs.find((item) => item.url.startsWith(serverUrl));
      expect(tab).toBeDefined();

      const result = await captureBrowserTab(endpoint, tab!.id, { mode: 'custom', width: 500, height: 333 });

      expect(result.width).toBe(500);
      expect(result.height).toBe(333);
      expect(result.assetId).toBeUndefined();
      await expectPngSize(result.imagePath, 500, 333);
    } finally {
      await stopBrowser(browserProcess);
      await rm(userDataDir, { recursive: true, force: true });
    }
  }, 60_000);
});

describe.runIf(process.env.RUN_EXTENSION_CAPTURE === '1')('extension capture', () => {
  it('captures options and popup pages from an unpacked fixture', async () => {
    const extensionDir = await mkdtemp(path.join(os.tmpdir(), 'store-shot-extension-'));

    try {
      await writeFile(
        path.join(extensionDir, 'manifest.json'),
        JSON.stringify(
          {
            manifest_version: 3,
            name: 'Fixture Extension',
            version: '1.0.0',
            background: { service_worker: 'background.js' },
            action: { default_popup: 'popup.html' },
            options_ui: { page: 'options.html' }
          },
          null,
          2
        )
      );
      await writeFile(path.join(extensionDir, 'background.js'), 'chrome.runtime.onInstalled.addListener(() => {});');
      await writeFile(path.join(extensionDir, 'popup.html'), '<body style="margin:0;background:#fff">Popup</body>');
      await writeFile(path.join(extensionDir, 'options.html'), '<body style="margin:0;background:#fff">Options</body>');

      const options = await captureExtensionOptions(extensionDir, 'edge-screenshot-640x480');
      const popup = await captureExtensionPopup(extensionDir, 'edge-screenshot-640x480');

      expect(options.detectedPath).toBe('options.html');
      expect(popup.detectedPath).toBe('popup.html');
      await expectPngSize(options.imagePath, 640, 480);
      await expectPngSize(popup.imagePath, 640, 480);
    } finally {
      await rm(extensionDir, { recursive: true, force: true });
    }
  }, 120_000);
});
