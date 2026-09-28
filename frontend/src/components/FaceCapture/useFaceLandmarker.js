import { useState, useEffect } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

export const useFaceLandmarker = () => {
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    
    const initModel = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        if (active) {
          setFaceLandmarker(landmarker);
          setIsLoaded(true);
        } else {
          landmarker.close();
        }
      } catch (err) {
        console.error("Failed to load FaceLandmarker", err);
      }
    };
    
    initModel();
    
    return () => {
      active = false;
    };
  }, []);

  return { faceLandmarker, isLoaded };
};
