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
    <div className="relative w-full h-[85vh] sm:rounded-3xl overflow-hidden bg-black flex flex-col items-center justify-center shadow-2xl">
      {hasCameraError ? (
        <div className="text-center text-white px-6">
          <Camera className="w-16 h-16 mx-auto mb-4 text-white/50" />
          <h3 className="text-xl font-bold mb-2">Camera Error</h3>
          <p className="text-white/70 mb-6">
            Please allow camera permissions to use Smart Scan.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" /> Retry Camera
            </button>
            <button
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full hover:bg-white/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover mirror-mode"
            style={{ transform: 'scaleX(-1)' }}
            autoPlay
            playsInline
            muted
            onPlay={handleVideoPlaying}
          />

          {!isLoaded ? (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
              <div className="w-12 h-12 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
              <p className="text-white font-medium">Initializing AI Quality Engine...</p>
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
