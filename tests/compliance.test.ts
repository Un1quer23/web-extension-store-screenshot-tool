import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateImageCompliance } from '../src/main/compliance';

let tempDir = '';

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'store-shot-compliance-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('validateImageCompliance', () => {
  it('passes a matching PNG size', async () => {
    const imagePath = path.join(tempDir, 'matching.png');
    await sharp({
      create: {
        width: 1280,
        height: 800,
        channels: 3,
        background: '#ffffff'
      }
    })
      .png()
      .toFile(imagePath);

    await expect(validateImageCompliance(imagePath, 'chrome-screenshot-1280x800')).resolves.toEqual([]);
  });

  it('returns an error for mismatched dimensions', async () => {
    const imagePath = path.join(tempDir, 'mismatch.png');
    await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: '#ffffff'
      }
    })
      .png()
      .toFile(imagePath);

    const issues = await validateImageCompliance(imagePath, 'chrome-screenshot-1280x800');
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: 'error', ruleId: 'image.dimensions.mismatch' })
    );
  });

  it('adds Opera guidance as a warning', async () => {
    const imagePath = path.join(tempDir, 'opera.png');
    await sharp({
      create: {
        width: 612,
        height: 408,
        channels: 3,
        background: '#ffffff'
      }
    })
      .png()
      .toFile(imagePath);

    const issues = await validateImageCompliance(imagePath, 'opera-screenshot-612x408');
    expect(issues).toContainEqual(expect.objectContaining({ severity: 'warning', ruleId: 'opera.visual-guidance' }));
  });

  it('adds promo and tile guidance as a warning', async () => {
    const imagePath = path.join(tempDir, 'promo.png');
    await sharp({
      create: {
        width: 440,
        height: 280,
        channels: 3,
        background: '#ffffff'
      }
    })
      .png()
      .toFile(imagePath);

    const issues = await validateImageCompliance(imagePath, 'chrome-small-promo-440x280');
    expect(issues).toContainEqual(expect.objectContaining({ severity: 'warning', ruleId: 'promo.visual-guidance' }));
  });

  it('validates custom targets without store guidance warnings', async () => {
    const imagePath = path.join(tempDir, 'custom.png');
    await sharp({
      create: {
        width: 390,
        height: 844,
        channels: 3,
        background: '#ffffff'
      }
    })
      .png()
      .toFile(imagePath);

    await expect(validateImageCompliance(imagePath, { mode: 'custom', width: 390, height: 844 })).resolves.toEqual([]);
  });

  it('rejects invalid custom targets', async () => {
    const imagePath = path.join(tempDir, 'invalid-custom.png');
    await sharp({
      create: {
        width: 390,
        height: 844,
        channels: 3,
        background: '#ffffff'
      }
    })
      .png()
      .toFile(imagePath);

    await expect(validateImageCompliance(imagePath, { mode: 'custom', width: 99, height: 844 })).rejects.toThrow(
      /between 100 and 7680/
    );
  });
});
