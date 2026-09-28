/**
 * Skin-Presence Detection Algorithm (ensemble, tone-inclusive)
 */

export const checkSkinPresence = (imageData) => {
  const data = imageData.data;
  const length = data.length;
  let skinPixels = 0;
  let totalPixels = 0;

  // Downsample: evaluate every 4th pixel (step by 16 bytes: 4 channels * 4 pixels)
  // to save performance while still getting an accurate percentage.
  for (let i = 0; i < length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Ignore pure black/transparent pixels from edge padding if any
    if (r === 0 && g === 0 && b === 0) continue;
    
    totalPixels++;

    // RGB to YCrCb
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    // RGB to HSV
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = (60 * ((g - b) / diff) + 360) % 360;
      } else if (max === g) {
        h = (60 * ((b - r) / diff) + 120) % 360;
      } else {
        h = (60 * ((r - g) / diff) + 240) % 360;
      }
    }
    const s = max === 0 ? 0 : diff / max;
    const v = max / 255;

    // Rule 1: YCrCb
    const passYCrCb = y > 40 && cb >= 85 && cb <= 135 && cr >= 135 && cr <= 180;

    // Rule 2: HSV
    const passHSV = (h <= 50 || h >= 340) && s >= 0.10 && s <= 0.75 && v > 0.20;

    // Rule 3: RGB (Kovac)
    const passRGBNormal = r > 95 && g > 40 && b > 20 && diff > 15 && Math.abs(r - g) > 15 && r > g && r > b;
    const passRGBFlash = r > 220 && g > 210 && b > 170 && Math.abs(r - g) <= 15 && r > b && g > b;
    const passRGB = passRGBNormal || passRGBFlash;

    // Ensemble Vote: at least 2 out of 3 rules must pass
    let votes = 0;
    if (passYCrCb) votes++;
    if (passHSV) votes++;
    if (passRGB) votes++;

    if (votes >= 2) {
      skinPixels++;
    }
  }

  const skinPixelPercentage = totalPixels > 0 ? skinPixels / totalPixels : 0;
  return {
    skinFound: skinPixelPercentage > 0.15, // 15% threshold
    percentage: skinPixelPercentage
  };
};
