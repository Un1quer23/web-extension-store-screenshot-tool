import { describe, expect, it } from 'vitest';
import { parseExtensionManifest } from '../src/main/manifest';

describe('parseExtensionManifest', () => {
  it('prefers MV3 options_ui and action popup', () => {
    expect(
      parseExtensionManifest({
        manifest_version: 3,
        action: { default_popup: '/popup.html' },
        options_ui: { page: 'pages/options.html' },
        options_page: 'legacy.html'
      })
    ).toEqual({
      optionsPath: 'pages/options.html',
      popupPath: 'popup.html'
    });
  });

  it('supports legacy options and browser action popup', () => {
    expect(
      parseExtensionManifest({
        manifest_version: 2,
        browser_action: { default_popup: 'legacy-popup.html' },
        options_page: '/options.html'
      })
    ).toEqual({
      optionsPath: 'options.html',
      popupPath: 'legacy-popup.html'
    });
  });

  it('returns empty info when pages are missing', () => {
    expect(parseExtensionManifest({ manifest_version: 3 })).toEqual({});
  });
});
