'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';

export default function VoiceScanner({ onVoiceResult, onClose }) {
  const [escuchando, setEscuchando] = useState(false);
  const [textoEscuchado, setTextoEscuchado] = useState('');
  const [soportaVoz, setSoportaVoz] = useState(true);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSoportaVoz(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL'; // Español de Chile / Latinoamérica
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setEscuchando(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setTextoEscuchado(transcript);

      if (event.results[0].isFinal) {
        setTimeout(() => {
          onVoiceResult(transcript);
        }, 800);
      }
    };

    recognition.onerror = (event) => {
      console.error('Error de reconocimiento de voz:', event.error);
      setEscuchando(false);
    };

    recognition.onend = () => {
      setEscuchando(false);
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [onVoiceResult]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-gray-900 rounded-3xl p-6 shadow-2xl border border-green-500/30 text-center space-y-6">
        
        {/* Botón Cerrar */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pt-2">
          <h3 className="font-bold text-lg text-white">Asistente de Voz</h3>
          <p className="text-xs text-gray-400 mt-1">
            Di cosas como: <br />
            <span className="text-green-400 font-semibold">"Agregar 2 leches"</span> o <span className="text-orange-400 font-semibold">"Descontar arroz"</span>
          </p>
        </div>

        {/* Micrófono Animado */}
        <div className="flex justify-center items-center py-4">
          {!soportaVoz ? (
            <div className="p-6 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
              <MicOff className="w-12 h-12" />
            </div>
          ) : (
            <div className={`relative p-7 rounded-full transition-all duration-300 ${escuchando ? 'bg-green-600/30 border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)] scale-110' : 'bg-gray-800 border border-gray-700'}`}>
              <Mic className={`w-12 h-12 ${escuchando ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
            </div>
          )}
        </div>

        {/* Texto Interpretado en Tiempo Real */}
        <div className="min-h-[50px] flex items-center justify-center">
          {!soportaVoz ? (
            <p className="text-xs text-red-400">Tu navegador no soporta reconocimiento por voz.</p>
          ) : textoEscuchado ? (
            <p className="text-base font-bold text-green-300 bg-gray-800/80 px-4 py-2 rounded-xl border border-gray-700 inline-block">
              "{textoEscuchado}"
            </p>
          ) : (
            <p className="text-xs text-gray-400 animate-pulse flex items-center justify-center gap-1">
              <Volume2 className="w-4 h-4 text-green-500" /> Escuchando... habla ahora
            </p>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-gray-800 text-gray-300 font-semibold py-2.5 rounded-xl text-xs border border-gray-700 hover:bg-gray-750"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}