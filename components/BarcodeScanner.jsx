'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onScanSuccess, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Detección nativa de códigos si el navegador lo soporta (BarcodeDetector API)
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new window.BarcodeDetector();
          const detectCode = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  onScanSuccess(barcodes[0].rawValue);
                  stopCamera();
                  return;
                }
              } catch (e) {
                console.error(e);
              }
            }
            requestAnimationFrame(detectCode);
          };
          detectCode();
        }
      } catch (err) {
        alert('No se pudo acceder a la cámara. Asegúrate de dar los permisos correspondientes.');
        onClose();
      }
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };

    startCamera();

    return () => stopCamera();
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/20 text-white p-2 rounded-full backdrop-blur-md"
        >
          <X className="w-6 h-6" />
        </button>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-80 object-cover"
        />

        <div className="p-4 text-center bg-gray-900 text-white text-xs">
          <p className="font-semibold">Apunta el código de barras o QR</p>
          <p className="text-gray-400 text-[10px] mt-1">Se detectará automáticamente</p>
        </div>
      </div>
    </div>
  );
}