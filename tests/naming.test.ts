import { describe, expect, it } from 'vitest';
import { fileTimestamp, screenshotFileName } from '../src/main/naming';

describe('screenshot file names', () => {
  it('uses a second-level timestamp', () => {
    expect(fileTimestamp(new Date('2026-05-28T15:54:18.079Z'))).toMatch(/^\d{8}-\d{6}$/);
  });

  it('includes the store, asset kind, dimensions, source prefix, and timestamp', () => {
    const first = screenshotFileName('url', 'chrome-screenshot-1280x800');
    const second = screenshotFileName('url', 'chrome-screenshot-1280x800');

    expect(first).toMatch(/^chrome-web-store-screenshot-1280x800-url-\d{8}-\d{6}\.png$/);
    expect(second).toMatch(/^chrome-web-store-screenshot-1280x800-url-\d{8}-\d{6}-2\.png$/);
  });

  it('uses custom dimensions in custom target file names', () => {
    const name = screenshotFileName('browser-tab', { mode: 'custom', width: 390, height: 844 });

    expect(name).toMatch(/^custom-390x844-browser-tab-\d{8}-\d{6}\.png$/);
  });
});
