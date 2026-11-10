'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onScanSuccess, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scannerId = 'reader-container';
    const html5QrCode = new Html5Qrcode(scannerId);

    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        html5QrCode.stop().then(() => {
          onScanSuccess(decodedText);
        }).catch((err) => console.error(err));
      },
      (errorMessage) => {
        // Errores de escaneo continuo se ignoran
      }
    ).catch((err) => {
      console.error('Error al iniciar la cámara:', err);
      alert('No se pudo iniciar la cámara. Asegúrate de dar los permisos necesarios.');
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch((err) => console.error(err));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm text-despensa-text">Escanea el Código de Barras</h3>
          <button onClick={onClose} className="p-1 bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div id="reader-container" className="w-full overflow-hidden rounded-2xl"></div>
      </div>
    </div>
  );
}