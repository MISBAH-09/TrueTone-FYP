import { QUALITY_THRESHOLDS } from './constants';

/**
 * 3-Tier Quality Checks (Bad, Borderline 'Ok', Good)
 * Corresponds to Section 5.2 of the Capture & Results UX Overhaul Plan
 */

export const checkDistance = (landmarks) => {
  if (!landmarks || landmarks.length === 0) {
    return { state: 'bad', label: 'Not Good', message: 'No face found', pass: false };
  }

  // Find bounding box
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  // Ensure the face is framed within screen boundaries
  if (minX < 0.05 || maxX > 0.95 || minY < 0.05 || maxY > 0.95) {
    return {
      state: 'bad',
      label: 'Not Good',
      message: 'Keep your face inside the oval',
      pass: false,
    };
  }

  const faceWidthRatio = maxX - minX;

  // 3-tier distance thresholds from Section 5.2
  if (faceWidthRatio < 0.25) {
    return { state: 'bad', label: 'Come Closer', message: 'Come closer to the camera', pass: false };
  }
  if (faceWidthRatio < 0.35) {
    return { state: 'ok', label: 'Move Closer', message: 'A bit closer to frame properly', pass: false };
  }
  if (faceWidthRatio > 0.65) {
    return { state: 'bad', label: 'Move Back', message: 'Move back a little', pass: false };
  }
  if (faceWidthRatio > 0.55) {
    return { state: 'ok', label: 'A Bit Back', message: 'Move back slightly', pass: false };
  }

  return { state: 'good', label: 'Good', message: '', pass: true };
};

export const checkPose = (landmarks) => {
  if (!landmarks || landmarks.length < 300) {
    return { state: 'good', label: 'Good', message: '', pass: true };
  }

  // MediaPipe Face Mesh landmark indices
  const leftEye = landmarks[263]; // Left eye outer corner
  const rightEye = landmarks[33]; // Right eye outer corner
  const nose = landmarks[1]; // Nose tip
  const mouth = landmarks[13]; // Upper lip

  // 1. Roll (tilt head left/right)
  const dy = Math.abs(rightEye.y - leftEye.y);
  const dx = Math.abs(rightEye.x - leftEye.x) || 0.001;
  const roll = Math.atan(dy / dx) * (180 / Math.PI);

  // 2. Yaw (turn head left/right)
  const distLeft = Math.sqrt(Math.pow(nose.x - leftEye.x, 2) + Math.pow(nose.y - leftEye.y, 2));
  const distRight = Math.sqrt(Math.pow(nose.x - rightEye.x, 2) + Math.pow(nose.y - rightEye.y, 2)) || 0.001;
  const yawRatio = distLeft / distRight;

  // 3. Pitch (tilt head up/down)
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  const distNoseToEyes = Math.abs(nose.y - eyeCenterY);
  const distNoseToMouth = Math.abs(mouth.y - nose.y) || 0.001;
  const pitchRatio = distNoseToEyes / distNoseToMouth;

  // Bad conditions
  if (roll > 12 || yawRatio < 0.55 || yawRatio > 1.8 || pitchRatio < 0.35 || pitchRatio > 2.2) {
    return {
      state: 'bad',
      label: 'Not Good',
      message: 'Look straight at the camera',
      pass: false,
    };
  }

  // Borderline Ok conditions
  if (roll > 7 || yawRatio < 0.72 || yawRatio > 1.38 || pitchRatio < 0.48 || pitchRatio > 1.85) {
    return {
      state: 'ok',
      label: 'Ok',
      message: 'Keep head level and straight',
      pass: false,
    };
  }

  return { state: 'good', label: 'Good', message: '', pass: true };
};

export const checkLighting = (imageData, landmarks) => {
  if (!imageData || !imageData.data) {
    return { state: 'bad', label: 'Not Good', message: 'Camera feed unavailable', pass: false };
  }

  const { data, width, height } = imageData;

  // 1. Determine Face Region vs Background Region
  let faceMinX = 0.25, faceMaxX = 0.75, faceMinY = 0.20, faceMaxY = 0.75;
  if (landmarks && landmarks.length > 0) {
    let lx0 = 1, lx1 = 0, ly0 = 1, ly1 = 0;
    for (const p of landmarks) {
      if (p.x < lx0) lx0 = p.x;
      if (p.x > lx1) lx1 = p.x;
      if (p.y < ly0) ly0 = p.y;
      if (p.y > ly1) ly1 = p.y;
    }
    faceMinX = Math.max(0.05, lx0);
    faceMaxX = Math.min(0.95, lx1);
    faceMinY = Math.max(0.05, ly0);
    faceMaxY = Math.min(0.95, ly1);
  }

  const fx0 = Math.floor(faceMinX * width);
  const fx1 = Math.floor(faceMaxX * width);
  const fy0 = Math.floor(faceMinY * height);
  const fy1 = Math.floor(faceMaxY * height);
  const fMidX = Math.floor((fx0 + fx1) / 2);

  let faceSum = 0, faceCount = 0;
  let faceLeftSum = 0, faceLeftCount = 0;
  let faceRightSum = 0, faceRightCount = 0;
  let bgSum = 0, bgCount = 0;
  let blownOutPixels = 0;
  let faceBlownOut = 0;

  // Sample every 2nd pixel for performance
  for (let y = 0; y < height; y += 2) {
    const isTopBg = y < height * 0.35;
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = r * 0.299 + g * 0.587 + b * 0.114;

      if (lum > 240) {
        blownOutPixels++;
      }

      const inFace = x >= fx0 && x <= fx1 && y >= fy0 && y <= fy1;
      if (inFace) {
        faceSum += lum;
        faceCount++;
        if (lum > 242) faceBlownOut++;

        if (x < fMidX) {
          faceLeftSum += lum;
          faceLeftCount++;
        } else {
          faceRightSum += lum;
          faceRightCount++;
        }
      } else if (isTopBg || x < width * 0.15 || x > width * 0.85) {
        bgSum += lum;
        bgCount++;
      }
    }
  }

  const sampledTotal = (height / 2) * (width / 2);
  const glareRatio = blownOutPixels / (sampledTotal || 1);
  const faceMean = faceCount > 0 ? faceSum / faceCount : 100;
  const bgMean = bgCount > 0 ? bgSum / bgCount : faceMean;
  const faceLeftMean = faceLeftCount > 0 ? faceLeftSum / faceLeftCount : faceMean;
  const faceRightMean = faceRightCount > 0 ? faceRightSum / faceRightCount : faceMean;
  const asymmetry = Math.abs(faceLeftMean - faceRightMean);

  // Severe Glare or Backlight Flare (e.g. bright light source / window behind head)
  if (glareRatio > 0.02) {
    return {
      state: 'bad',
      label: 'Not Good',
      message: 'Avoid strong light or window behind you',
      pass: false,
    };
  }

  // Backlight check: background significantly brighter than face, causing underexposure
  if ((bgMean - faceMean > 65 && bgMean > 160) || (bgMean > 200 && faceMean < 90)) {
    return {
      state: 'bad',
      label: 'Not Good',
      message: 'Turn around to face the light',
      pass: false,
    };
  }

  // Too dark face
  if (faceMean < 65) {
    return {
      state: 'bad',
      label: 'Not Good',
      message: 'Move to a brighter area',
      pass: false,
    };
  }

  // Overexposed face
  if (faceMean > 200 || (faceCount > 0 && faceBlownOut / faceCount > 0.05)) {
    return {
      state: 'bad',
      label: 'Not Good',
      message: 'Face is overexposed, reduce harsh light',
      pass: false,
    };
  }

  // Harsh side shadow / uneven
  if (asymmetry > 52) {
    return {
      state: 'bad',
      label: 'Not Good',
      message: 'Lighting is uneven on face',
      pass: false,
    };
  }

  // Borderline checks (strict: do not say Good unless truly balanced!)
  if (faceMean < 78) {
    return {
      state: 'ok',
      label: 'Not Good',
      message: 'Lighting is slightly dim',
      pass: false,
    };
  }
  if (bgMean - faceMean > 18 && bgMean > 130) {
    return {
      state: 'ok',
      label: 'Not Good',
      message: 'Slight backlighting detected',
      pass: false,
    };
  }

  // Truly balanced lighting
  return {
    state: 'good',
    label: 'Good',
    message: '',
    pass: true,
  };
};

export const checkBlur = (imageData) => {
  const { data, width, height } = imageData;

  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  let sum = 0;
  let sqSum = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const top = gray[idx - width];
      const bottom = gray[idx + width];
      const left = gray[idx - 1];
      const right = gray[idx + 1];
      const center = gray[idx];

      const laplacian = top + bottom + left + right - 4 * center;
      sum += laplacian;
      sqSum += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sqSum / count - mean * mean;

  if (variance < QUALITY_THRESHOLDS.BLUR_VARIANCE_MIN) {
    return { state: 'bad', label: 'Hold Still', message: 'Hold camera still', pass: false };
  }

  return { state: 'good', label: 'Good', message: '', pass: true };
};
