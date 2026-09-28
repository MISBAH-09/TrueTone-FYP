import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Crop, Maximize2, Square, RectangleVertical } from 'lucide-react';

export const ManualCropScreen = ({ imageSrc, onApply, onCancel }) => {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(undefined); // default: freeform cropping
  const imgRef = useRef(null);

  const onImageLoad = (e) => {
    // Initial crop: generous 85% centered box so the entire photo context is visible
    setCrop({
      unit: '%',
      x: 7.5,
      y: 7.5,
      width: 85,
      height: 85,
    });
  };

  const handleSelectFull = () => {
    setAspect(undefined);
    setCrop({
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  };

  const handleSetAspect = (newAspect) => {
    setAspect(newAspect);
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    if (newAspect) {
      let w = 80;
      let h = (w * (width / height)) / newAspect;
      if (h > 90) {
        h = 90;
        w = h * newAspect * (height / width);
      }
      setCrop({
        unit: '%',
        x: Math.max(0, (100 - w) / 2),
        y: Math.max(0, (100 - h) / 2),
        width: Math.min(100, w),
        height: Math.min(100, h),
      });
    }
  };

  const handleApplyCrop = () => {
    const image = imgRef.current;
    if (!image) return;

    // If no crop or 100% full view
    if (!completedCrop || completedCrop.width <= 0 || completedCrop.height <= 0) {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const file = new File([blob], 'cropped_face.jpg', { type: 'image/jpeg' });
          onApply(file);
        },
        'image/jpeg',
        0.95
      );
      return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCropX = Math.max(0, Math.floor(completedCrop.x * scaleX));
    const pixelCropY = Math.max(0, Math.floor(completedCrop.y * scaleY));
    const pixelCropW = Math.min(
      image.naturalWidth - pixelCropX,
      Math.floor(completedCrop.width * scaleX)
    );
    const pixelCropH = Math.min(
      image.naturalHeight - pixelCropY,
      Math.floor(completedCrop.height * scaleY)
    );

    canvas.width = Math.max(1, pixelCropW);
    canvas.height = Math.max(1, pixelCropH);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      pixelCropX,
      pixelCropY,
      pixelCropW,
      pixelCropH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'cropped_face.jpg', { type: 'image/jpeg' });
        onApply(file);
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col items-center p-4 sm:p-6 max-h-[92vh] overflow-y-auto animate-fadeIn">
      {/* Top Header with Close */}
      <div className="w-full flex items-center justify-between mb-3 px-2">
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="font-bold text-slate-900 text-base sm:text-lg">
          Adjust Photo Framing
        </span>
        <div className="w-10"></div>
      </div>

      {/* Aspect Ratio Toolbar */}
      <div className="w-full flex items-center justify-center gap-2 mb-3 flex-wrap">
        <button
          onClick={() => handleSetAspect(undefined)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            aspect === undefined
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Crop className="w-3.5 h-3.5" />
          Free Crop
        </button>
        <button
          onClick={() => handleSetAspect(4 / 5)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            aspect === 4 / 5
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <RectangleVertical className="w-3.5 h-3.5" />
          Portrait (4:5)
        </button>
        <button
          onClick={() => handleSetAspect(1)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            aspect === 1
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          Square (1:1)
        </button>
        <button
          onClick={handleSelectFull}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Select Full
        </button>
      </div>

      {/* Cropper Container — Fully visible photo without any clipping */}
      <div className="relative w-full flex items-center justify-center bg-slate-900/5 rounded-2xl p-2 sm:p-4 border border-slate-200">
        <div className="manual-crop-wrapper">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            ruleOfThirds={true}
            className="shadow-md"
          >
            <img
              ref={imgRef}
              alt="Crop target"
              src={imageSrc}
              onLoad={onImageLoad}
              className="select-none"
            />
          </ReactCrop>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3 text-center">
        Drag the handles to crop your choice part. Full photo is visible above.
      </p>

      {/* Apply Button */}
      <div className="w-full mt-4 px-4 pb-1">
        <button
          onClick={handleApplyCrop}
          className="w-full sm:w-64 mx-auto block py-3 px-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm tracking-wide transition shadow-md hover:shadow-lg active:scale-[0.98] text-center"
        >
          Apply
        </button>
      </div>

      <style>{`
        /* Ensure the image is NEVER clipped and is 100% visible inside the cropper area */
        .manual-crop-wrapper {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
          max-height: 56vh !important;
        }

        .manual-crop-wrapper .ReactCrop {
          max-width: 100% !important;
          max-height: 56vh !important;
          display: inline-flex !important;
          justify-content: center !important;
          align-items: center !important;
        }

        .manual-crop-wrapper .ReactCrop__child-wrapper {
          max-height: 56vh !important;
          max-width: 100% !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          overflow: visible !important;
        }

        .manual-crop-wrapper .ReactCrop__child-wrapper > img {
          max-width: 100% !important;
          max-height: 56vh !important;
          width: auto !important;
          height: auto !important;
          display: block !important;
          object-fit: scale-down !important;
        }

        .manual-crop-wrapper .ReactCrop__crop-selection {
          border: 2px solid rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.45) !important;
        }

        .manual-crop-wrapper .ReactCrop__rule-of-thirds-hz,
        .manual-crop-wrapper .ReactCrop__rule-of-thirds-vt {
          border-color: rgba(255, 255, 255, 0.65) !important;
        }

        .manual-crop-wrapper .ReactCrop__drag-handle {
          width: 16px !important;
          height: 16px !important;
          background-color: #ffffff !important;
          border: 2px solid #10b981 !important;
          border-radius: 4px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
        }
      `}</style>
    </div>
  );
};
