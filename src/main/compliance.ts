import sharp from 'sharp';
import { captureTargetSize, getAssetPreset, type AssetPresetId, type CaptureTarget, type ComplianceIssue } from '../shared/types';

export async function validateImageCompliance(
  imagePath: string,
  target: AssetPresetId | CaptureTarget
): Promise<ComplianceIssue[]> {
  const captureTarget: CaptureTarget = typeof target === 'string' ? { mode: 'preset', assetId: target } : target;
  const size = captureTargetSize(captureTarget);
  const issues: ComplianceIssue[] = [];

  try {
    const metadata = await sharp(imagePath).metadata();

    if (!metadata.width || !metadata.height) {
      issues.push({
        severity: 'error',
        ruleId: 'image.metadata.unreadable-size',
        message: 'Cannot read the exported PNG dimensions.'
      });
    } else if (metadata.width !== size.width || metadata.height !== size.height) {
      issues.push({
        severity: 'error',
        ruleId: 'image.dimensions.mismatch',
        message: `Expected ${size.width} x ${size.height}, got ${metadata.width} x ${metadata.height}.`
      });
    }

    if (metadata.format !== 'png') {
      issues.push({
        severity: 'error',
        ruleId: 'image.format.png',
        message: 'The current export must be a PNG file.'
      });
    }
  } catch {
    issues.push({
      severity: 'error',
      ruleId: 'image.metadata.unreadable',
      message: 'Cannot read the exported PNG metadata.'
    });
  }

  if (captureTarget.mode === 'custom') {
    return issues;
  }

  const asset = getAssetPreset(captureTarget.assetId);

  if (asset.storeId === 'opera-addons') {
    issues.push({
      severity: 'warning',
      ruleId: 'opera.visual-guidance',
      message: 'Opera recommends clear screenshots, preferably on a white background, no larger than 800 x 600.'
    });
  }

  if (
    (asset.storeId === 'chrome-web-store' || asset.storeId === 'edge-addons') &&
    (asset.kind === 'promo' || asset.kind === 'tile' || asset.kind === 'marquee')
  ) {
    issues.push({
      severity: 'warning',
      ruleId: 'promo.visual-guidance',
      message: 'Promo and tile assets should be designed marketing graphics. This version only validates the canvas size.'
    });
  }

  return issues;
}

export function hasBlockingComplianceIssue(issues: ComplianceIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}
