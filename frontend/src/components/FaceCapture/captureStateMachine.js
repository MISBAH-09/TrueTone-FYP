import { useState, useRef, useCallback } from 'react';
import { CAPTURE_STATES, TIMERS } from './constants';
import { checkDistance, checkPose, checkLighting, checkBlur } from './qualityChecks';
import { checkSkinPresence } from './skinPresenceCheck';

const COUNTDOWN_TOTAL_MS = 1500; // 3-2-1 countdown duration (~500ms each)

export const useCaptureStateMachine = ({ onCapture }) => {
  const [state, setState] = useState(CAPTURE_STATES.SEARCHING);
  const [feedbackMessage, setFeedbackMessage] = useState("Keep your face inside the oval");
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [badges, setBadges] = useState({
    lighting: { state: 'bad', label: 'Not Good' },
    lookStraight: { state: 'bad', label: 'Not Good' },
    facePosition: { state: 'bad', label: 'Not Good' },
  });

  const noFaceStartTime = useRef(null);
  const lastSkinCheckTime = useRef(0);
  const stableTimer = useRef(null);
  const countdownStartTime = useRef(null);
  const isCapturing = useRef(false);

  // Hidden canvas for extracting pixel data
  const offscreenCanvas = useRef(document.createElement('canvas'));

  const getImageData = (videoElement) => {
    const canvas = offscreenCanvas.current;
    if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Mirror the capture horizontally since user video is mirrored
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const cancelCountdown = () => {
    if (stableTimer.current) {
      clearTimeout(stableTimer.current);
      stableTimer.current = null;
    }
    countdownStartTime.current = null;
    setCountdown(null);
    setProgress(0);
  };

  const processFrame = useCallback((videoElement, faceLandmarkerResult) => {
    if (isCapturing.current) return;

    const faces = faceLandmarkerResult.faceLandmarks;

    // 1. Face Detection Check
    if (!faces || faces.length === 0) {
      cancelCountdown();
      setBadges({
        lighting: { state: 'bad', label: 'Not Good' },
        lookStraight: { state: 'bad', label: 'Not Good' },
        facePosition: { state: 'bad', label: 'Not Good' },
      });

      // Handle Skin Fallback Timer (2.5 seconds)
      if (!noFaceStartTime.current) {
        noFaceStartTime.current = Date.now();
        setState(CAPTURE_STATES.SEARCHING);
        setFeedbackMessage("Keep your face inside the oval");
      } else {
        const elapsed = Date.now() - noFaceStartTime.current;
        if (elapsed >= TIMERS.NO_FACE_TIMEOUT_MS) {
          const timeSinceSkinCheck = Date.now() - lastSkinCheckTime.current;
          if (timeSinceSkinCheck > TIMERS.SKIN_CHECK_INTERVAL_MS) {
            lastSkinCheckTime.current = Date.now();
            const imageData = getImageData(videoElement);
            const { skinFound } = checkSkinPresence(imageData);

            if (skinFound) {
              setState(CAPTURE_STATES.NO_FACE_SKIN);
              setFeedbackMessage("Skin detected, but no face. Please center your face.");
            } else {
              setState(CAPTURE_STATES.NO_FACE_NONE);
              setFeedbackMessage("No face detected. Keep your face inside the oval.");
            }
          }
        }
      }
      return;
    }

    // --- Face is found ---
    noFaceStartTime.current = null;
    const landmarks = faces[0];

    // Extract image data for lighting/blur checks
    const imageData = getImageData(videoElement);

    // 2. Run 3-Tier Quality Gates
    const distCheck = checkDistance(landmarks);
    const poseCheck = checkPose(landmarks);
    const lightCheck = checkLighting(imageData, landmarks);
    const blurCheck = checkBlur(imageData);

    setBadges({
      lighting: { state: lightCheck.state, label: lightCheck.label },
      lookStraight: { state: poseCheck.state, label: poseCheck.label },
      facePosition: { state: distCheck.state, label: distCheck.label },
    });

    const allGood = distCheck.pass && poseCheck.pass && lightCheck.pass && blurCheck.pass;

    if (!allGood) {
      // Something is not in the "good" band -> immediately cancel countdown
      cancelCountdown();
      setState(CAPTURE_STATES.FACE_FOUND_CHECKING);

      let msg = "Keep your face inside the oval";
      if (!distCheck.pass && distCheck.message) msg = distCheck.message;
      else if (!poseCheck.pass && poseCheck.message) msg = poseCheck.message;
      else if (!lightCheck.pass && lightCheck.message) msg = lightCheck.message;
      else if (!blurCheck.pass && blurCheck.message) msg = blurCheck.message;

      setFeedbackMessage(msg);
      return;
    }

    // 3. All checks pass -> initiate / maintain 3-2-1 countdown
    setState(CAPTURE_STATES.FACE_FOUND_STABLE);
    setFeedbackMessage("");

    if (!countdownStartTime.current) {
      countdownStartTime.current = Date.now();
      setCountdown(3);
      setProgress(0);

      const runCountdown = () => {
        if (!countdownStartTime.current || isCapturing.current) return;
        const elapsed = Date.now() - countdownStartTime.current;

        if (elapsed < 500) {
          setCountdown(3);
        } else if (elapsed < 1000) {
          setCountdown(2);
        } else if (elapsed < COUNTDOWN_TOTAL_MS) {
          setCountdown(1);
        }

        const p = Math.min(100, (elapsed / COUNTDOWN_TOTAL_MS) * 100);
        setProgress(p);

        if (elapsed >= COUNTDOWN_TOTAL_MS) {
          // Trigger capture!
          isCapturing.current = true;
          setState(CAPTURE_STATES.CAPTURED);
          setCountdown(null);

          const canvas = offscreenCanvas.current;

          // Capture the natural high-resolution frame cleanly (no artificial cutoffs)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
                onCapture(file);
              }
            },
            'image/jpeg',
            0.95
          );
        } else {
          stableTimer.current = setTimeout(runCountdown, 30);
        }
      };

      stableTimer.current = setTimeout(runCountdown, 30);
    }
  }, [onCapture]);

  const reset = useCallback(() => {
    setState(CAPTURE_STATES.SEARCHING);
    setFeedbackMessage("Keep your face inside the oval");
    setProgress(0);
    setCountdown(null);
    isCapturing.current = false;
    noFaceStartTime.current = null;
    countdownStartTime.current = null;
    if (stableTimer.current) clearTimeout(stableTimer.current);
    stableTimer.current = null;
    setBadges({
      lighting: { state: 'bad', label: 'Not Good' },
      lookStraight: { state: 'bad', label: 'Not Good' },
      facePosition: { state: 'bad', label: 'Not Good' },
    });
  }, []);

  return { state, feedbackMessage, progress, countdown, badges, processFrame, reset };
};
