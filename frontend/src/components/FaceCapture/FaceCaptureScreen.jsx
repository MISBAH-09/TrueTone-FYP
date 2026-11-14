import React, { useRef, useEffect, useState } from 'react';
import { useFaceLandmarker } from './useFaceLandmarker';
import { useCaptureStateMachine } from './captureStateMachine';
import { CaptureOverlay } from './CaptureOverlay';
import { Camera, RefreshCw } from 'lucide-react';

export const FaceCaptureScreen = ({ onCaptureSuccess, onCancel }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(null);
  const [hasCameraError, setHasCameraError] = useState(false);

  const { faceLandmarker, isLoaded } = useFaceLandmarker();
  const { state, feedbackMessage, progress, countdown, badges, processFrame, reset } =
    useCaptureStateMachine({
      onCapture: (file) => {
        stopCamera();
        onCaptureSuccess(file);
      },
    });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setHasCameraError(false);
    } catch (err) {
      console.error('Camera access denied or unavailable', err);
      setHasCameraError(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const analyzeVideoFrame = () => {
    const video = videoRef.current;
    if (video && video.readyState >= 2 && faceLandmarker) {
      let startTimeMs = performance.now();
      const results = faceLandmarker.detectForVideo(video, startTimeMs);
      processFrame(video, results, startTimeMs);
    }
    requestRef.current = requestAnimationFrame(analyzeVideoFrame);
  };

  const handleVideoPlaying = () => {
    if (isLoaded && faceLandmarker) {
      requestRef.current = requestAnimationFrame(analyzeVideoFrame);
    }
  };

  useEffect(() => {
    if (isLoaded && videoRef.current && videoRef.current.readyState >= 2) {
      requestRef.current = requestAnimationFrame(analyzeVideoFrame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isLoaded, faceLandmarker]);

  return (
    <div className="relative flex h-[85vh] w-full flex-col items-center justify-center overflow-hidden bg-black sm:rounded-[var(--tt-radius)]">
      {hasCameraError ? (
        <div className="px-6 text-center text-white">
          <Camera className="mx-auto mb-4 h-16 w-16 text-white/50" />
          <h3 className="mb-2 text-xl font-semibold">Camera Error</h3>
          <p className="mb-6 text-white/70">
            Please allow camera permissions to use Smart Scan.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={startCamera}
              className="inline-flex h-[var(--tt-control-h)] items-center gap-2 rounded-[var(--tt-radius)] bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" /> Retry Camera
            </button>
            <button
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="inline-flex h-[var(--tt-control-h)] items-center rounded-[var(--tt-radius)] bg-white/20 px-4 text-sm font-medium text-white transition-colors hover:bg-white/30"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover mirror-mode"
            style={{ transform: 'scaleX(-1)' }}
            autoPlay
            playsInline
            muted
            onPlay={handleVideoPlaying}
          />

          {!isLoaded ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80">
              <div className="mb-4 h-10 w-10 animate-spin rounded-[var(--tt-radius)] border-2 border-white/20 border-t-[var(--tt-primary-hover)]" />
              <p className="font-medium text-white">Initializing AI Quality Engine...</p>
            </div>
          ) : (
            <CaptureOverlay
              state={state}
              feedbackMessage={feedbackMessage}
              badges={badges}
              countdown={countdown}
              progress={progress}
              onClose={() => {
                stopCamera();
                onCancel();
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
