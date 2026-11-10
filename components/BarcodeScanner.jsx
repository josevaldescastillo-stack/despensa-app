'use client';

import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function BarcodeScanner({ onScanSuccess, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (error) => {
        // Ignorar errores continuos de escaneo
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Error al cerrar escáner:", error));
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-4 w-full max-w-sm text-center shadow-xl relative">
        <h3 className="font-bold text-despensa-text mb-2 text-base">Escanear Código de Barras</h3>
        <p className="text-xs text-despensa-subtext mb-4">Apunta la cámara al código del producto</p>
        
        <div id="reader" className="w-full rounded-2xl overflow-hidden border border-despensa-primary/30"></div>

        <button 
          onClick={onClose}
          className="mt-4 w-full bg-red-500 text-white font-bold py-2.5 rounded-full text-xs transition hover:bg-red-600"
        >
          Cancelar Escaneo
        </button>
      </div>
    </div>
  );
}