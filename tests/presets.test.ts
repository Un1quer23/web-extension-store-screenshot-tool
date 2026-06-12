import { describe, expect, it } from 'vitest';
import { ASSET_PRESETS, STORE_PRESETS, getAssetsForStore, getAssetPreset, validateCaptureTarget } from '../src/shared/types';

describe('store asset presets', () => {
  it('uses unique asset ids', () => {
    const ids = ASSET_PRESETS.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains the planned browser extension stores', () => {
    expect(STORE_PRESETS.map((store) => store.id)).toEqual([
      'chrome-web-store',
      'edge-addons',
      'firefox-amo',
      'opera-addons'
    ]);
  });

  it('groups assets by store', () => {
    expect(getAssetsForStore('chrome-web-store').map((asset) => asset.id)).toEqual([
      'chrome-screenshot-1280x800',
      'chrome-screenshot-640x400',
      'chrome-small-promo-440x280',
      'chrome-marquee-1400x560'
    ]);
    expect(getAssetsForStore('edge-addons')).toHaveLength(4);
    expect(getAssetsForStore('firefox-amo')).toHaveLength(1);
    expect(getAssetsForStore('opera-addons')).toHaveLength(2);
  });

  it('keeps official dimensions on key presets', () => {
    expect(getAssetPreset('edge-screenshot-640x480')).toMatchObject({ width: 640, height: 480 });
    expect(getAssetPreset('chrome-small-promo-440x280')).toMatchObject({ width: 440, height: 280 });
    expect(getAssetPreset('opera-screenshot-612x408')).toMatchObject({ width: 612, height: 408 });
  });

  it('validates custom capture targets', () => {
    expect(validateCaptureTarget({ mode: 'custom', width: 1920, height: 1080 })).toEqual({
      mode: 'custom',
      width: 1920,
      height: 1080
    });
    expect(() => validateCaptureTarget({ mode: 'custom', width: 0, height: 1080 })).toThrow(/between 100 and 7680/);
    expect(() => validateCaptureTarget({ mode: 'custom', width: 7680, height: 4321 })).toThrow(/too large/);
  });
});
