'use client';

import { ShoppingCart, Star, Home, Bookmark, Grid } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-despensa-primary text-white rounded-t-3xl py-3 px-6 flex justify-between items-center shadow-lg z-50">
      <button 
        onClick={() => setActiveTab('carrito')}
        className={`relative p-2 rounded-full transition ${activeTab === 'carrito' ? 'bg-white/20' : ''}`}
        title="Carrito / Compras"
      >
        <ShoppingCart className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          1
        </span>
      </button>

      <button 
        onClick={() => setActiveTab('favoritos')}
        className={`p-2 rounded-full transition ${activeTab === 'favoritos' ? 'bg-white/20' : ''}`}
        title="Favoritos"
      >
        <Star className="w-6 h-6" />
      </button>

      <button 
        onClick={() => setActiveTab('inicio')}
        className={`p-2 rounded-full transition ${activeTab === 'inicio' ? 'bg-white/20' : ''}`}
        title="Inicio"
      >
        <Home className="w-6 h-6" />
      </button>

      <button 
        onClick={() => setActiveTab('reportes')}
        className={`p-2 rounded-full transition ${activeTab === 'reportes' ? 'bg-white/20' : ''}`}
        title="Reportes / PDF"
      >
        <Bookmark className="w-6 h-6" />
      </button>

      <button 
        onClick={() => setActiveTab('categorias')}
        className={`p-2 rounded-full transition ${activeTab === 'categorias' ? 'bg-white/20' : ''}`}
        title="Categorías"
      >
        <Grid className="w-6 h-6" />
      </button>
    </nav>
  );
}