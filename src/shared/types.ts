export const STORE_PRESETS = [
  {
    id: 'chrome-web-store',
    label: 'Chrome Web Store',
    officialSummary: 'Screenshots: 1280x800 or 640x400. Small promo is required; marquee is optional.'
  },
  {
    id: 'edge-addons',
    label: 'Microsoft Edge Add-ons',
    officialSummary: 'Screenshots: 1280x800 or 640x480. Small and large tile assets are supported.'
  },
  {
    id: 'firefox-amo',
    label: 'Firefox AMO',
    officialSummary: 'Recommended maximum display size is 1280x800; keep other screenshots near a 1.6:1 ratio.'
  },
  {
    id: 'opera-addons',
    label: 'Opera Add-ons',
    officialSummary: 'Recommended screenshot size is 612x408; keep images clear and no larger than 800x600.'
  }
] as const;

export type StorePreset = (typeof STORE_PRESETS)[number];
export type StorePresetId = StorePreset['id'];
export type AppLanguage = 'zh-CN' | 'en-US';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export type ThemeState = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
};

export type BrowserRuntime = {
  name: 'Chrome' | 'Edge';
  executablePath: string;
};

export const ASSET_PRESETS = [
  {
    id: 'chrome-screenshot-1280x800',
    storeId: 'chrome-web-store',
    kind: 'screenshot',
    label: 'Screenshot 1280x800',
    width: 1280,
    height: 800,
    format: 'png',
    requiredLevel: 'required',
    notes: 'Chrome Web Store accepts 1280x800 screenshots. Listings need 1-5 screenshots.'
  },
  {
    id: 'chrome-screenshot-640x400',
    storeId: 'chrome-web-store',
    kind: 'screenshot',
    label: 'Screenshot 640x400',
    width: 640,
    height: 400,
    format: 'png',
    requiredLevel: 'required',
    notes: 'Chrome Web Store accepts 640x400 screenshots as the smaller supported screenshot size.'
  },
  {
    id: 'chrome-small-promo-440x280',
    storeId: 'chrome-web-store',
    kind: 'promo',
    label: 'Small Promo 440x280',
    width: 440,
    height: 280,
    format: 'png',
    requiredLevel: 'required',
    notes: 'Small promotional image for Chrome Web Store listings. This version only enforces canvas size.'
  },
  {
    id: 'chrome-marquee-1400x560',
    storeId: 'chrome-web-store',
    kind: 'marquee',
    label: 'Marquee 1400x560',
    width: 1400,
    height: 560,
    format: 'png',
    requiredLevel: 'optional',
    notes: 'Optional Chrome Web Store marquee promotional image. This version only enforces canvas size.'
  },
  {
    id: 'edge-screenshot-1280x800',
    storeId: 'edge-addons',
    kind: 'screenshot',
    label: 'Screenshot 1280x800',
    width: 1280,
    height: 800,
    format: 'png',
    requiredLevel: 'required',
    notes: 'Microsoft Edge Add-ons accepts 1280x800 screenshots. Listings can include up to 6 screenshots.'
  },
  {
    id: 'edge-screenshot-640x480',
    storeId: 'edge-addons',
    kind: 'screenshot',
    label: 'Screenshot 640x480',
    width: 640,
    height: 480,
    format: 'png',
    requiredLevel: 'required',
    notes: 'Microsoft Edge Add-ons accepts 640x480 screenshots as the smaller supported screenshot size.'
  },
  {
    id: 'edge-small-tile-440x280',
    storeId: 'edge-addons',
    kind: 'tile',
    label: 'Small Tile 440x280',
    width: 440,
    height: 280,
    format: 'png',
    requiredLevel: 'required',
    notes: 'Small tile image for Microsoft Edge Add-ons. This version only enforces canvas size.'
  },
  {
    id: 'edge-large-tile-1400x560',
    storeId: 'edge-addons',
    kind: 'tile',
    label: 'Large Tile 1400x560',
    width: 1400,
    height: 560,
    format: 'png',
    requiredLevel: 'optional',
    notes: 'Large tile image for Microsoft Edge Add-ons. This version only enforces canvas size.'
  },
  {
    id: 'firefox-screenshot-1280x800',
    storeId: 'firefox-amo',
    kind: 'screenshot',
    label: 'Screenshot 1280x800',
    width: 1280,
    height: 800,
    format: 'png',
    requiredLevel: 'recommended',
    notes: 'Firefox AMO recommends 1280x800 as the largest display size. Custom 1.6:1 exports can come later.'
  },
  {
    id: 'opera-screenshot-612x408',
    storeId: 'opera-addons',
    kind: 'screenshot',
    label: 'Screenshot 612x408',
    width: 612,
    height: 408,
    format: 'png',
    requiredLevel: 'recommended',
    notes: 'Opera Add-ons recommends 612x408 screenshots with clear, readable content.'
  },
  {
    id: 'opera-max-safe-800x600',
    storeId: 'opera-addons',
    kind: 'screenshot',
    label: 'Max-safe 800x600',
    width: 800,
    height: 600,
    format: 'png',
    requiredLevel: 'optional',
    notes: 'Opera Add-ons guidance says screenshots should not exceed 800x600.'
  }
] as const;

export type AssetPreset = (typeof ASSET_PRESETS)[number];
export type AssetPresetId = AssetPreset['id'];
export type AssetSize = {
  width: number;
  height: number;
};

export const CUSTOM_SIZE_LIMITS = {
  min: 100,
  max: 7680,
  maxArea: 7680 * 4320
} as const;

export type PresetCaptureTarget = {
  mode: 'preset';
  assetId: AssetPresetId;
};

export type CustomCaptureTarget = {
  mode: 'custom';
  width: number;
  height: number;
};

export type CaptureTarget = PresetCaptureTarget | CustomCaptureTarget;

export type UrlScrollMode = 'top' | 'middle' | 'bottom' | 'custom';

export type UrlCaptureOptions = {
  scrollMode: UrlScrollMode;
  scrollY: number;
};

export type PagePositionInfo = {
  scrollMode: UrlScrollMode;
  scrollY: number;
  maxScrollY: number;
};

export type ComplianceIssue = {
  severity: 'error' | 'warning' | 'info';
  message: string;
  ruleId: string;
};

export function getStorePreset(id: StorePresetId): StorePreset {
  const preset = STORE_PRESETS.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Unknown store preset: ${id}`);
  }
  return preset;
}

export function getAssetPreset(id: AssetPresetId): AssetPreset {
  const preset = ASSET_PRESETS.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Unknown asset preset: ${id}`);
  }
  return preset;
}

export function getAssetsForStore(storeId: StorePresetId): AssetPreset[] {
  return ASSET_PRESETS.filter((item) => item.storeId === storeId);
}

export function validateCaptureTarget(target: CaptureTarget): CaptureTarget {
  if (target.mode === 'preset') {
    getAssetPreset(target.assetId);
    return target;
  }

  const { min, max, maxArea } = CUSTOM_SIZE_LIMITS;
  const width = Number(target.width);
  const height = Number(target.height);

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error('Custom width and height must be whole numbers.');
  }

  if (width < min || height < min || width > max || height > max) {
    throw new Error(`Custom width and height must be between ${min} and ${max} pixels.`);
  }

  if (width * height > maxArea) {
    throw new Error('Custom image size is too large. Use 7680 x 4320 pixels or less.');
  }

  return { mode: 'custom', width, height };
}

export function captureTargetSize(target: CaptureTarget): AssetSize {
  const validTarget = validateCaptureTarget(target);
  if (validTarget.mode === 'preset') {
    const asset = getAssetPreset(validTarget.assetId);
    return { width: asset.width, height: asset.height };
  }

  return { width: validTarget.width, height: validTarget.height };
}

export type CaptureResult = {
  imagePath: string;
  previewDataUrl?: string;
  suggestedFileName?: string;
  width: number;
  height: number;
  assetId?: AssetPresetId;
  target: CaptureTarget;
  compliance: ComplianceIssue[];
  pagePosition?: PagePositionInfo;
  detectedPath?: string;
  note?: string;
};

export type BrowserTab = {
  id: string;
  title: string;
  url: string;
};

export type ExtensionManifestInfo = {
  optionsPath?: string;
  popupPath?: string;
};
