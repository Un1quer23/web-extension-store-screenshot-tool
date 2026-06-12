import type {
  AppLanguage,
  AssetPreset,
  AssetPresetId,
  ComplianceIssue,
  StorePreset,
  StorePresetId,
  ThemeMode,
  UrlScrollMode
} from '../../shared/types';

type SourceId = 'url' | 'extension' | 'browser';

type StorePresetCopy = {
  label: string;
  officialSummary: string;
};

type AssetPresetCopy = {
  label: string;
  notes: string;
};

export type SourceGuideItem =
  | string
  | {
      text: string;
      copyText: string;
    };

export type AppCopy = {
  brandTitle: string;
  brandSubtitle: string;
  captureSource: string;
  captureSourceAria: string;
  captureSettings: string;
  store: string;
  asset: string;
  customSize: string;
  customWidth: string;
  customHeight: string;
  ready: string;
  actionFailed: string;
  pageUrl: string;
  pagePosition: string;
  customScrollY: string;
  capturePage: string;
  unpackedExtensionDirectory: string;
  chooseDirectory: string;
  options: string;
  popup: string;
  optionsNotConfigured: string;
  popupNotConfigured: string;
  manifestNoPages: string;
  waitingForValidExtension: string;
  extensionNoOptions: string;
  extensionNoPopup: string;
  cdpEndpoint: string;
  refreshTabs: string;
  tab: string;
  noTabSelected: string;
  chooseTabFirst: string;
  captureTab: string;
  previewAria: string;
  previewAlt: string;
  detectedPage: string;
  exportAria: string;
  compliance: string;
  exportPng: string;
  pngExported: string;
  openExportFolder: string;
  copyCommand: string;
  copied: string;
  operationGuide: string;
  pendingValidation: string;
  captureReady: string;
  previewTitle: string;
  theme: string;
  themeLabels: Record<ThemeMode, string>;
  browserRuntimeMissing: string;
  captureFirst: string;
  captured: (width: number, height: number) => string;
  foundTabs: (count: number) => string;
  pagePositionSummary: (scrollY: number, maxScrollY: number) => string;
  sourceLabels: Record<SourceId, string>;
  sourceGuides: Record<SourceId, SourceGuideItem[]>;
  urlScrollModeLabels: Record<UrlScrollMode, string>;
};

export const APP_COPY: Record<AppLanguage, AppCopy> = {
  'zh-CN': {
    brandTitle: 'Web 扩展商店截图工具',
    brandSubtitle: '浏览器扩展上架素材导出',
    captureSource: '截图来源',
    captureSourceAria: '截图来源',
    captureSettings: '截图设置',
    store: '商店',
    asset: '素材',
    customSize: '自定义尺寸',
    customWidth: '宽',
    customHeight: '高',
    ready: '就绪',
    actionFailed: '操作失败',
    pageUrl: '网址',
    pagePosition: '页面位置',
    customScrollY: '自定义滚动位置 px',
    capturePage: '截取网页',
    unpackedExtensionDirectory: '未打包扩展目录',
    chooseDirectory: '选择目录',
    options: '选项页',
    popup: '弹窗页',
    optionsNotConfigured: '选项页：未配置',
    popupNotConfigured: '弹窗页：未配置',
    manifestNoPages: 'manifest.json 未配置选项页或弹窗页。',
    waitingForValidExtension: '等待选择有效的未打包扩展目录。',
    extensionNoOptions: '这个扩展没有配置选项页。',
    extensionNoPopup: '这个扩展没有配置弹窗页。',
    cdpEndpoint: 'CDP 远程调试地址',
    refreshTabs: '刷新页面列表',
    tab: '目标页面',
    noTabSelected: '未选择页面',
    chooseTabFirst: '请先选择一个已打开页面。',
    captureTab: '截取页面',
    previewAria: '截图预览',
    previewAlt: '截图预览',
    detectedPage: '已识别页面',
    exportAria: '导出',
    compliance: '合规校验',
    exportPng: '导出 PNG',
    pngExported: 'PNG 已导出',
    openExportFolder: '打开文件夹',
    copyCommand: '复制',
    copied: '已复制',
    operationGuide: '操作指南',
    pendingValidation: '等待截图',
    captureReady: '已截图',
    previewTitle: '预览',
    theme: '主题',
    themeLabels: {
      light: '亮色',
      dark: '暗色',
      system: '跟随系统'
    },
    browserRuntimeMissing: '未找到 Chrome 或 Edge',
    captureFirst: '请先完成一张截图。',
    captured: (width, height) => `已截图 ${width} x ${height}`,
    foundTabs: (count) => `找到 ${count} 个页面`,
    pagePositionSummary: (scrollY, maxScrollY) => `当前滚动到 Y=${scrollY}px，可滚动最大值 ${maxScrollY}px。`,
    sourceLabels: {
      url: '输入网址',
      extension: '本地扩展',
      browser: '已打开页面'
    },
    sourceGuides: {
      browser: [
        {
          text: '启动 Chrome。复制命令后粘贴到 PowerShell 运行：',
          copyText:
            '& "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\\store-shot-chrome-cdp"'
        },
        {
          text: '启动 Edge。复制命令后粘贴到 PowerShell 运行：',
          copyText:
            '& "${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\\store-shot-edge-cdp"'
        },
        '在新浏览器窗口里打开目标页面，并手动调整到要截图的状态。',
        '保持 CDP 地址为 http://127.0.0.1:9222；如果端口不同，请同步修改。',
        '点击“刷新页面列表”，选择目标页面；标题相同的时候看下方 URL 确认。'
      ],
      url: [
        '输入要截图的网址，包含 https:// 或 http://。',
        '选择页面位置：顶部、中部、底部，或输入自定义滚动像素。',
        '点击“截取网页”，工具会用本机 Chrome 或 Edge 打开页面并截图。'
      ],
      extension: [
        '选择未打包扩展的根目录，也就是包含 manifest.json 的那一层目录。',
        '选择后工具会读取 manifest，识别 options_ui.page、options_page 和 action/default_popup。',
        '如果识别成功，会在提示文字里显示可用的选项页或弹窗页路径。',
        '点击“选项页”会截取扩展的设置页面；点击“弹窗页”会截取工具栏弹窗页面。',
        '按钮不可用通常表示 manifest 没有配置对应页面，或当前选择的目录不是扩展根目录。'
      ]
    },
    urlScrollModeLabels: {
      top: '顶部',
      middle: '中部',
      bottom: '底部',
      custom: '自定义像素'
    }
  },
  'en-US': {
    brandTitle: 'Web Extension Store Screenshot Tool',
    brandSubtitle: 'Extension asset exporter',
    captureSource: 'Capture Source',
    captureSourceAria: 'Capture source',
    captureSettings: 'Capture settings',
    store: 'Store',
    asset: 'Asset',
    customSize: 'Custom size',
    customWidth: 'Width',
    customHeight: 'Height',
    ready: 'Ready',
    actionFailed: 'Action failed',
    pageUrl: 'Page URL',
    pagePosition: 'Page position',
    customScrollY: 'Custom scroll Y px',
    capturePage: 'Capture page',
    unpackedExtensionDirectory: 'Unpacked extension directory',
    chooseDirectory: 'Choose directory',
    options: 'Options',
    popup: 'Popup',
    optionsNotConfigured: 'Options: not configured',
    popupNotConfigured: 'Popup: not configured',
    manifestNoPages: 'manifest.json does not configure an options page or popup page.',
    waitingForValidExtension: 'Waiting for a valid unpacked extension directory.',
    extensionNoOptions: 'This extension does not define an options page.',
    extensionNoPopup: 'This extension does not define a popup page.',
    cdpEndpoint: 'CDP endpoint',
    refreshTabs: 'Refresh pages',
    tab: 'Target page',
    noTabSelected: 'No page selected',
    chooseTabFirst: 'Choose an opened page first.',
    captureTab: 'Capture page',
    previewAria: 'Screenshot preview',
    previewAlt: 'Screenshot preview',
    detectedPage: 'Detected page',
    exportAria: 'Export',
    compliance: 'Compliance',
    exportPng: 'Export PNG',
    pngExported: 'PNG exported',
    openExportFolder: 'Open folder',
    copyCommand: 'Copy',
    copied: 'Copied',
    operationGuide: 'Operation guide',
    pendingValidation: 'Waiting for capture',
    captureReady: 'Captured',
    previewTitle: 'Preview',
    theme: 'Theme',
    themeLabels: {
      light: 'Light',
      dark: 'Dark',
      system: 'System'
    },
    browserRuntimeMissing: 'Chrome or Edge not found',
    captureFirst: 'Capture an image first.',
    captured: (width, height) => `Captured ${width} x ${height}`,
    foundTabs: (count) => `Found ${count} pages`,
    pagePositionSummary: (scrollY, maxScrollY) => `Captured at scroll Y=${scrollY}px; maximum scroll is ${maxScrollY}px.`,
    sourceLabels: {
      url: 'Enter URL',
      extension: 'Local extension',
      browser: 'Opened page'
    },
    sourceGuides: {
      browser: [
        {
          text: 'Start Chrome. Copy the command and run it in PowerShell:',
          copyText:
            '& "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\\store-shot-chrome-cdp"'
        },
        {
          text: 'Start Edge. Copy the command and run it in PowerShell:',
          copyText:
            '& "${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\\store-shot-edge-cdp"'
        },
        'In that new browser window, open the target page and prepare the exact state to capture.',
        'Keep the CDP endpoint as http://127.0.0.1:9222; update it here if you use a different port.',
        'Refresh pages and choose the target page; if titles look similar, confirm with the URL shown below.'
      ],
      url: [
        'Enter the page URL, including https:// or http://.',
        'Choose the page position: top, middle, bottom, or a custom scroll offset.',
        'Capture the page. The tool opens it with the local Chrome or Edge runtime.'
      ],
      extension: [
        'Choose the unpacked extension root directory, the folder that directly contains manifest.json.',
        'The tool reads manifest.json and detects options_ui.page, options_page, and action/default_popup.',
        'When detection succeeds, the note shows which options or popup path is available.',
        'Use Options to capture the extension settings page, or Popup to capture the toolbar popup page.',
        'A disabled button usually means that page is not configured, or the selected folder is not the extension root.'
      ]
    },
    urlScrollModeLabels: {
      top: 'Top',
      middle: 'Middle',
      bottom: 'Bottom',
      custom: 'Custom pixels'
    }
  }
};

const STORE_COPY: Record<AppLanguage, Record<StorePresetId, StorePresetCopy>> = {
  'zh-CN': {
    'chrome-web-store': {
      label: 'Chrome Web Store',
      officialSummary: '截图支持 1280x800 或 640x400。小宣传图必需，Marquee 图可选。'
    },
    'edge-addons': {
      label: 'Microsoft Edge Add-ons',
      officialSummary: '截图支持 1280x800 或 640x480。支持小磁贴和大磁贴素材。'
    },
    'firefox-amo': {
      label: 'Firefox AMO',
      officialSummary: '推荐最大显示尺寸为 1280x800，其他截图尽量保持 1.6:1 比例。'
    },
    'opera-addons': {
      label: 'Opera Add-ons',
      officialSummary: '推荐截图尺寸为 612x408，图片应清晰且不超过 800x600。'
    }
  },
  'en-US': {
    'chrome-web-store': {
      label: 'Chrome Web Store',
      officialSummary: 'Screenshots: 1280x800 or 640x400. Small promo is required; marquee is optional.'
    },
    'edge-addons': {
      label: 'Microsoft Edge Add-ons',
      officialSummary: 'Screenshots: 1280x800 or 640x480. Small and large tile assets are supported.'
    },
    'firefox-amo': {
      label: 'Firefox AMO',
      officialSummary: 'Recommended maximum display size is 1280x800; keep other screenshots near a 1.6:1 ratio.'
    },
    'opera-addons': {
      label: 'Opera Add-ons',
      officialSummary: 'Recommended screenshot size is 612x408; keep images clear and no larger than 800x600.'
    }
  }
};

const ASSET_COPY: Record<AppLanguage, Record<AssetPresetId, AssetPresetCopy>> = {
  'zh-CN': {
    'chrome-screenshot-1280x800': {
      label: '截图 1280x800',
      notes: 'Chrome Web Store 接受 1280x800 截图，列表需要 1-5 张截图。'
    },
    'chrome-screenshot-640x400': {
      label: '截图 640x400',
      notes: 'Chrome Web Store 接受 640x400 作为较小截图尺寸。'
    },
    'chrome-small-promo-440x280': {
      label: '小宣传图 440x280',
      notes: 'Chrome Web Store 列表的小宣传图。当前版本只校验画布尺寸。'
    },
    'chrome-marquee-1400x560': {
      label: 'Marquee 图 1400x560',
      notes: 'Chrome Web Store 可选 Marquee 宣传图。当前版本只校验画布尺寸。'
    },
    'edge-screenshot-1280x800': {
      label: '截图 1280x800',
      notes: 'Microsoft Edge Add-ons 接受 1280x800 截图，最多可包含 6 张。'
    },
    'edge-screenshot-640x480': {
      label: '截图 640x480',
      notes: 'Microsoft Edge Add-ons 接受 640x480 作为较小截图尺寸。'
    },
    'edge-small-tile-440x280': {
      label: '小磁贴 440x280',
      notes: 'Microsoft Edge Add-ons 小磁贴图片。当前版本只校验画布尺寸。'
    },
    'edge-large-tile-1400x560': {
      label: '大磁贴 1400x560',
      notes: 'Microsoft Edge Add-ons 大磁贴图片。当前版本只校验画布尺寸。'
    },
    'firefox-screenshot-1280x800': {
      label: '截图 1280x800',
      notes: 'Firefox AMO 推荐 1280x800 作为最大显示尺寸。'
    },
    'opera-screenshot-612x408': {
      label: '截图 612x408',
      notes: 'Opera Add-ons 推荐 612x408 截图，内容需要清晰可读。'
    },
    'opera-max-safe-800x600': {
      label: '最大安全尺寸 800x600',
      notes: 'Opera Add-ons 指引建议截图不要超过 800x600。'
    }
  },
  'en-US': {
    'chrome-screenshot-1280x800': {
      label: 'Screenshot 1280x800',
      notes: 'Chrome Web Store accepts 1280x800 screenshots. Listings need 1-5 screenshots.'
    },
    'chrome-screenshot-640x400': {
      label: 'Screenshot 640x400',
      notes: 'Chrome Web Store accepts 640x400 screenshots as the smaller supported screenshot size.'
    },
    'chrome-small-promo-440x280': {
      label: 'Small Promo 440x280',
      notes: 'Small promotional image for Chrome Web Store listings. This version only enforces canvas size.'
    },
    'chrome-marquee-1400x560': {
      label: 'Marquee 1400x560',
      notes: 'Optional Chrome Web Store marquee promotional image. This version only enforces canvas size.'
    },
    'edge-screenshot-1280x800': {
      label: 'Screenshot 1280x800',
      notes: 'Microsoft Edge Add-ons accepts 1280x800 screenshots. Listings can include up to 6 screenshots.'
    },
    'edge-screenshot-640x480': {
      label: 'Screenshot 640x480',
      notes: 'Microsoft Edge Add-ons accepts 640x480 screenshots as the smaller supported screenshot size.'
    },
    'edge-small-tile-440x280': {
      label: 'Small Tile 440x280',
      notes: 'Small tile image for Microsoft Edge Add-ons. This version only enforces canvas size.'
    },
    'edge-large-tile-1400x560': {
      label: 'Large Tile 1400x560',
      notes: 'Large tile image for Microsoft Edge Add-ons. This version only enforces canvas size.'
    },
    'firefox-screenshot-1280x800': {
      label: 'Screenshot 1280x800',
      notes: 'Firefox AMO recommends 1280x800 as the largest display size. Custom 1.6:1 exports can come later.'
    },
    'opera-screenshot-612x408': {
      label: 'Screenshot 612x408',
      notes: 'Opera Add-ons recommends 612x408 screenshots with clear, readable content.'
    },
    'opera-max-safe-800x600': {
      label: 'Max-safe 800x600',
      notes: 'Opera Add-ons guidance says screenshots should not exceed 800x600.'
    }
  }
};

export function storeCopy(language: AppLanguage, store: StorePreset): StorePresetCopy {
  return STORE_COPY[language][store.id];
}

export function assetCopy(language: AppLanguage, asset: AssetPreset): AssetPresetCopy {
  return ASSET_COPY[language][asset.id];
}

export function complianceMessage(language: AppLanguage, issue: ComplianceIssue): string {
  if (language === 'en-US') {
    return issue.message;
  }

  const messages: Record<string, string> = {
    'image.metadata.unreadable-size': '无法读取导出 PNG 的尺寸。',
    'image.format.png': '当前导出必须是 PNG 文件。',
    'image.metadata.unreadable': '无法读取导出 PNG 的元数据。',
    'opera.visual-guidance': 'Opera 建议截图清晰，最好使用白色背景，且不超过 800 x 600。',
    'promo.visual-guidance': '宣传图和磁贴应设计成营销素材。当前版本只校验画布尺寸。'
  };

  if (issue.ruleId === 'image.dimensions.mismatch') {
    const match = issue.message.match(/Expected (.+), got (.+)\./);
    return match ? `尺寸不匹配：应为 ${match[1]}，实际为 ${match[2]}。` : '图片尺寸不符合当前预设。';
  }

  return messages[issue.ruleId] ?? issue.message;
}

export function localizedNote(language: AppLanguage, note: string): string {
  if (language === 'en-US') {
    return note;
  }

  if (note.startsWith('Captured page at scroll Y ')) {
    const match = note.match(/Captured page at scroll Y (\d+) of (\d+)\./);
    return match ? `已滚动到 Y=${match[1]}px 后截图；页面最大可滚动 ${match[2]}px。` : note;
  }

  const notes: Record<string, string> = {
    'The selected browser tab viewport was resized to the target asset before capture.':
      '已将所选页面视口调整为目标素材尺寸后截图。'
  };

  return notes[note] ?? note;
}

export function localizedError(language: AppLanguage, message: string): string {
  if (language === 'en-US') {
    return message;
  }

  const errors: Record<string, string> = {
    'Please enter a URL to capture.': '请先输入要截图的 URL。',
    'Unable to detect the extension ID. Make sure the unpacked extension can start in Chromium.':
      '无法识别扩展 ID。请确认未打包扩展能在 Chromium 中启动。',
    'manifest.json does not define an options page.': 'manifest.json 中没有配置选项页。',
    'manifest.json does not define a popup page.': 'manifest.json 中没有配置弹窗页。',
    'Please enter the browser remote debugging endpoint.': '请先输入浏览器远程调试地址。',
    'The selected browser tab was not found. Refresh the tab list and try again.':
      '没有找到所选页面。请刷新页面列表后重试。',
    'Chrome or Microsoft Edge was not found. Install Chrome or Edge, then try again.':
      '未找到 Chrome 或 Microsoft Edge。请安装 Chrome 或 Edge 后重试。'
  };

  return errors[message] ?? message;
}
