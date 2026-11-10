'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onScanSuccess, onClose }) {
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const scannerId = 'reader-container';
    
    // Formatos soportados explícitamente para mayor velocidad y precisión
    const config = {
      fps: 15, // Más cuadros por segundo para mayor fluidez
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        // Área rectangular óptima para códigos de barra horizontales y QR
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(minEdge * 0.85),
          height: Math.floor(minEdge * 0.45)
        };
      },
      aspectRatio: 1.0,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true // Aprovecha la aceleración por hardware del celular si está disponible
      }
    };

    const html5QrCode = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE
      ]
    });
    
    html5QrCodeRef.current = html5QrCode;

    // Iniciar cámara trasera con enfoque automático
    html5QrCode.start(
      { facingMode: { exact: 'environment' } },
      config,
      (decodedText) => {
        // Al detectar con éxito, detener cámara y enviar código
        html5QrCode.stop().then(() => {
          onScanSuccess(decodedText);
        }).catch((err) => console.error(err));
      },
      () => {
        // Ignorar errores menores por cuadro no leído
      }
    ).catch(() => {
      // Si falla 'environment' exacto, intentar con la cámara trasera por defecto
      html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          html5QrCode.stop().then(() => {
            onScanSuccess(decodedText);
          }).catch((err) => console.error(err));
        },
        () => {}
      ).catch((err) => {
        console.error('Error iniciando cámara:', err);
        alert('No se pudo abrir la cámara. Asegúrate de dar los permisos.');
      });
    });

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((err) => console.error(err));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
        
        {/* Barra superior con botón cerrar */}
        <div className="flex justify-between items-center p-4 bg-gray-900/80 text-white border-b border-gray-800">
          <div>
            <h3 className="font-bold text-sm">Escanear Código</h3>
            <p className="text-[10px] text-gray-400">Apunta la línea roja al código de barras</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor de Cámara con Marco y Línea Láser */}
        <div className="relative w-full bg-black overflow-hidden flex items-center justify-center min-h-[300px]">
          <div id="reader-container" className="w-full"></div>

          {/* Guía visual con marco y línea roja animada */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="w-full h-36 border-2 border-green-500/80 rounded-2xl relative shadow-[0_0_15px_rgba(34,197,94,0.3)] overflow-hidden flex items-center">
              {/* Esquinas destacadas */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-400"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-400"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-400"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-400"></div>
              
              {/* Línea láser de centrado */}
              <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#f87171] animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="p-3 text-center bg-gray-900 text-gray-400 text-[11px]">
          Mantén el teléfono a unos 15 - 20 cm de distancia
        </div>
      </div>
    </div>
  );
}