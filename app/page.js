'use client';

import { useState, useEffect } from 'react';
import { Search, Menu, User, Plus, Trash2, FileText, AlertTriangle, Mic, Share2, ShoppingCart, Check, Edit2, Minus, Star, Grid, Box, ListPlus, Moon, Sun, DollarSign, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import AuthModal from '@/components/AuthModal';
import VoiceScanner from '@/components/VoiceScanner';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('inicio'); 
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [codigoDespensa, setCodigoDespensa] = useState('');
  const [mostrarVoz, setMostrarVoz] = useState(false);

  // Control de autenticación
  const [mostrarAuthModal, setMostrarAuthModal] = useState(true);
  const [mostrarMenuDesplegable, setMostrarMenuDesplegable] = useState(false);

  // Modo Oscuro
  const [darkMode, setDarkMode] = useState(false);

  // Formulario & Edición
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('Kg');
  const [cantidad, setCantidad] = useState('');
  const [min, setMin] = useState('');
  const [stockDeseado, setStockDeseado] = useState('');
  const [precio, setPrecio] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');

  // Listas de Supermercado
  const [listaCompras, setListaCompras] = useState([]);
  const [listaDistinta, setListaDistinta] = useState([
    { id: 1, nombre: 'Carbón para asado', cantidad: 2, precio: 5000, comprado: false }
  ]);
  const [nuevoNombreDistinto, setNuevoNombreDistinto] = useState('');
  const [nuevoCantidadDistinto, setNuevoCantidadDistinto] = useState('1');
  const [nuevoPrecioDistinto, setNuevoPrecioDistinto] = useState('');

  // 1. VERIFICACIÓN Y CONTROL DE SESIÓN
  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setMostrarAuthModal(false);
      } else {
        setMostrarAuthModal(true);
      }
    };

    verificarSesion();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setMostrarAuthModal(false);
      } else {
        setMostrarAuthModal(true);
        setProductos([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCerrarSesion = async () => {
    if (confirm('¿Deseas cerrar tu sesión actual?')) {
      await supabase.auth.signOut();
      setCodigoDespensa('');
      setMostrarAuthModal(true);
    }
  };

  useEffect(() => {
    if (codigoDespensa) fetchProductos();
  }, [codigoDespensa]);

  const fetchProductos = async () => {
    if (!codigoDespensa) return;

    let { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('despensa_codigo', codigoDespensa);

    if (error || !data || data.length === 0) {
      const { data: despensa } = await supabase
        .from('despensas')
        .select('id')
        .eq('codigo', codigoDespensa)
        .maybeSingle();

      if (despensa?.id) {
        const { data: prods } = await supabase
          .from('productos')
          .select('*')
          .eq('despensa_id', despensa.id);
        data = prods;
      }
    }

    setProductos(data || []);
  };

  // Lógica de Procesamiento de Comando de Voz
  const handleVoiceCommand = async (transcript) => {
    setMostrarVoz(false);
    const texto = transcript.toLowerCase();

    // Extraer números si existen en la frase
    const numerosEncontrados = texto.match(/\d+/g);
    const cantidadCambio = numerosEncontrados ? parseFloat(numerosEncontrados[0]) : 1;

    // Buscar si la frase contiene "agregar", "sumar" o "descontar", "gaste", "quitar"
    const esDescuento = texto.includes('descontar') || texto.includes('gasté') || texto.includes('gaste') || texto.includes('quitar') || texto.includes('menos');
    const esSuma = texto.includes('agregar') || texto.includes('sumar') || texto.includes('compré') || texto.includes('compre') || texto.includes('más') || texto.includes('mas');

    // Buscar coincidencia de nombre con algún producto del inventario
    const productoCoincidente = productos.find(p => texto.includes(p.nombre.toLowerCase()));

    if (productoCoincidente) {
      const delta = esDescuento ? -cantidadCambio : cantidadCambio;
      await cambiarStock(productoCoincidente.id, productoCoincidente.cantidad, delta);
      alert(`¡Actualizado! ${productoCoincidente.nombre}: ${delta > 0 ? '+' : ''}${delta} unidades.`);
    } else {
      // Si no encuentra producto exacto, lo coloca en el buscador o rellena el formulario
      setBusqueda(transcript);
      if (activeTab === 'agregar') setNombre(transcript);
    }
  };

  useEffect(() => {
    if (productos.length > 0) {
      const lista = productos
        .filter((p) => p.cantidad < (p.stock_deseado || p.min || 1))
        .map((p) => {
          const deseado = p.stock_deseado || p.min || 1;
          const faltante = deseado - p.cantidad;
          return {
            id: p.id,
            nombre: p.nombre,
            precio: p.precio || 0,
            cantidadComprar: faltante > 0 ? faltante : 1,
            unidad: p.unidad,
            comprado: false,
          };
        });
      setListaCompras(lista);
    }
  }, [productos]);

  const calcularEstadoVencimiento = (fechaStr) => {
    if (!fechaStr) return 'normal';
    const hoy = new Date();
    const venc = new Date(fechaStr);
    const diffDias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return 'vencido';
    if (diffDias <= 7) return 'proximo';
    return 'normal';
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !cantidad || !precio) return alert('Completa los campos obligatorios');

    const { data: despensa } = await supabase
      .from('despensas')
      .select('id')
      .eq('codigo', codigoDespensa)
      .maybeSingle();

    const productoData = {
      nombre,
      unidad,
      cantidad: parseFloat(cantidad),
      min: parseFloat(min || 1),
      stock_deseado: parseFloat(stockDeseado || min || cantidad),
      precio: parseFloat(precio),
      vencimiento: vencimiento || null,
      codigo_barras: codigoBarras || null,
      despensa_codigo: codigoDespensa,
      ...(despensa?.id ? { despensa_id: despensa.id } : {})
    };

    let errorGuardado = null;

    if (editandoId) {
      const { error } = await supabase.from('productos').update(productoData).eq('id', editandoId);
      errorGuardado = error;
    } else {
      const { error } = await supabase.from('productos').insert([productoData]);
      errorGuardado = error;
    }

    if (errorGuardado) {
      alert('Error al guardar en Supabase: ' + errorGuardado.message);
    } else {
      alert('¡Producto guardado exitosamente!');
      limpiarFormulario();
      await fetchProductos();
      setActiveTab('inicio');
    }
  };

  const prepararEdicion = (prod) => {
    setEditandoId(prod.id);
    setNombre(prod.nombre);
    setUnidad(prod.unidad);
    setCantidad(prod.cantidad);
    setMin(prod.min);
    setStockDeseado(prod.stock_deseado || '');
    setPrecio(prod.precio);
    setVencimiento(prod.vencimiento || '');
    setCodigoBarras(prod.codigo_barras || '');
    setActiveTab('agregar');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setNombre('');
    setCantidad('');
    setMin('');
    setStockDeseado('');
    setPrecio('');
    setVencimiento('');
    setCodigoBarras('');
  };

  const cambiarStock = async (id, cantidadActual, delta) => {
    const nuevaCantidad = Math.max(0, cantidadActual + delta);
    await supabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
    fetchProductos();
  };

  const toggleFavorito = async (prod) => {
    await supabase.from('productos').update({ favorito: !prod.favorito }).eq('id', prod.id);
    fetchProductos();
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar producto?')) return;
    await supabase.from('productos').delete().eq('id', id);
    fetchProductos();
  };

  const agregarAListaDistinta = (e) => {
    e.preventDefault();
    if (!nuevoNombreDistinto.trim()) return;
    const newItem = {
      id: Date.now(),
      nombre: nuevoNombreDistinto,
      cantidad: parseFloat(nuevoCantidadDistinto || 1),
      precio: parseFloat(nuevoPrecioDistinto || 0),
      comprado: false,
    };
    setListaDistinta([...listaDistinta, newItem]);
    setNuevoNombreDistinto('');
    setNuevoCantidadDistinto('1');
    setNuevoPrecioDistinto('');
  };

  const totalDistinto = listaDistinta.reduce((acc, item) => acc + (item.comprado ? 0 : item.precio * item.cantidad), 0);
  const totalEstimadoSuper = listaCompras.reduce((acc, item) => acc + (item.comprado ? 0 : item.precio * item.cantidadComprar), 0);
  const valorTotalInventario = productos.reduce((acc, p) => acc + (p.cantidad * p.precio), 0);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className={`w-full min-h-screen pb-32 pt-4 px-3 flex flex-col font-sans transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-[#f5e8d9] text-[#3f5228]'}`}>
      
      {/* MODAL DE AUTENTICACIÓN */}
      {mostrarAuthModal && (
        <AuthModal 
          onLoginSuccess={(codigoAsignado) => {
            if (codigoAsignado) setCodigoDespensa(codigoAsignado);
            setMostrarAuthModal(false);
          }} 
        />
      )}

      {/* MODAL ASISTENTE DE VOZ */}
      {mostrarVoz && (
        <VoiceScanner 
          onVoiceResult={handleVoiceCommand} 
          onClose={() => setMostrarVoz(false)} 
        />
      )}

      {/* Encabezado */}
      <header className="flex justify-between items-center mb-4 px-1 relative">
        <button onClick={() => setMostrarMenuDesplegable(!mostrarMenuDesplegable)} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-800 text-green-400' : 'hover:bg-black/5 text-[#3f5228]'}`}>
          <Menu className="w-7 h-7" />
        </button>

        {mostrarMenuDesplegable && (
          <div className={`absolute top-12 left-0 rounded-2xl shadow-xl border p-2 z-50 w-60 space-y-1 ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-[#3f5228]/20 text-[#3f5228]'}`}>
            <button onClick={() => { setActiveTab('listaDistinta'); setMostrarMenuDesplegable(false); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-black/5 rounded-xl flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-orange-500" /> Lista Distinta (Personalizada)
            </button>
            <button onClick={() => { setActiveTab('gastos'); setMostrarMenuDesplegable(false); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-black/5 rounded-xl flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Resumen de Gastos
            </button>
            <button onClick={() => { setActiveTab('reportes'); setMostrarMenuDesplegable(false); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-black/5 rounded-xl flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Reportes PDF
            </button>
          </div>
        )}

        {/* Código de Despensa */}
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="font-bold text-xs">Despensa: </span>
            <input type="text" value={codigoDespensa} onChange={(e) => setCodigoDespensa(e.target.value)} className={`border rounded px-2 py-0.5 text-xs font-semibold w-24 text-center ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white/60 border-[#3f5228]/30'}`} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full border ${darkMode ? 'border-gray-700 text-yellow-400 hover:bg-gray-800' : 'border-[#3f5228]/30 text-[#3f5228] hover:bg-black/5'}`} title="Cambiar Tema">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Únete a nuestra despensa compartida! Ingresa con este código: *${codigoDespensa}*`)}`, '_blank')} className={`p-2 rounded-full border ${darkMode ? 'border-gray-700 text-green-400 hover:bg-gray-800' : 'border-[#3f5228]/30 text-[#3f5228] hover:bg-black/5'}`} title="Compartir por WhatsApp">
            <Share2 className="w-5 h-5" />
          </button>
          
          <button onClick={handleCerrarSesion} className="p-2 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10" title="Cerrar Sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Buscador con Botón de Voz */}
      {activeTab === 'inicio' && (
        <div className="relative mb-4 flex gap-2">
          <div className="relative flex-1">
            <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={`w-full border rounded-full py-2.5 pl-12 pr-4 text-sm shadow-sm outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-[#3f5228]/30 text-[#3f5228]'}`} />
            <Search className="w-5 h-5 text-green-600 absolute left-4 top-3" />
          </div>
          <button onClick={() => setMostrarVoz(true)} className="bg-[#3f5228] text-white p-2.5 rounded-full shadow-sm hover:opacity-90 flex items-center justify-center" title="Dictar por Voz">
            <Mic className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Título de Pestaña */}
      <div className="text-center mb-3">
        <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#3f5228]'}`}>
          {activeTab === 'inicio' && 'Inventario General'}
          {activeTab === 'supermercado' && 'Supermercado (Stock Faltante)'}
          {activeTab === 'listaDistinta' && 'Lista Distinta (Personalizada)'}
          {activeTab === 'favoritos' && 'Productos Favoritos'}
          {activeTab === 'cuadricula' && 'Vista de Cuadrícula'}
          {activeTab === 'agregar' && (editandoId ? 'Editar Producto' : 'Nuevo Producto')}
          {activeTab === 'gastos' && 'Control de Gastos y Valor'}
          {activeTab === 'reportes' && 'Reportes Financieros'}
        </h1>
      </div>

      {/* VISTA 1: INICIO */}
      {activeTab === 'inicio' && (
        <div className="space-y-3 flex-1">
          {productosFiltrados.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No hay productos en esta despensa.</p>
          ) : (
            productosFiltrados.map((prod) => {
              const estadoVenc = calcularEstadoVencimiento(prod.vencimiento);
              const esCritico = prod.cantidad <= (prod.min || 1);
              
              let bordeColor = darkMode ? 'border-gray-700 bg-gray-800' : 'border-transparent bg-white';
              if (estadoVenc === 'vencido') bordeColor = 'border-red-500 bg-red-950/20';
              else if (estadoVenc === 'proximo') bordeColor = 'border-yellow-500 bg-yellow-950/20';
              else if (esCritico) bordeColor = 'border-red-300 bg-red-50/50';

              return (
                <div key={prod.id} className={`rounded-2xl p-4 flex items-center justify-between shadow-sm border ${bordeColor}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleFavorito(prod)}><Star className={`w-4 h-4 ${prod.favorito ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} /></button>
                      <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-[#3f5228]'}`}>{prod.nombre}</h3>
                      {estadoVenc === 'vencido' && <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">⚠️ VENCIDO</span>}
                      {estadoVenc === 'proximo' && <span className="bg-yellow-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">⏳ Vence pronto</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Vence: {prod.vencimiento || 'Sin fecha'} | Deseado: {prod.stock_deseado || prod.min || 1} {prod.unidad}</p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className={`flex items-center rounded-lg border p-1 gap-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <button onClick={() => cambiarStock(prod.id, prod.cantidad, -1)} className="p-1 hover:bg-red-500/20 rounded text-red-500 font-bold"><Minus className="w-3.5 h-3.5" /></button>
                        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{prod.cantidad} {prod.unidad}</span>
                        <button onClick={() => cambiarStock(prod.id, prod.cantidad, 1)} className="p-1 hover:bg-green-500/20 rounded text-green-500 font-bold"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <span className={`text-sm font-extrabold ${darkMode ? 'text-green-400' : 'text-[#3f5228]'}`}>${prod.precio?.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => prepararEdicion(prod)} className="p-2 text-green-600 rounded-full hover:bg-black/5"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleEliminar(prod.id)} className="p-2 text-red-500 rounded-full hover:bg-black/5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VISTA 2: SUPERMERCADO AUTOMÁTICO */}
      {activeTab === 'supermercado' && (
        <div className="space-y-4 flex-1">
          <div className={`flex justify-between items-center p-4 rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#3f5228]/20'}`}>
            <div>
              <h2 className="text-sm font-bold">Faltantes de Inventario</h2>
              <p className="text-xs text-gray-400">{listaCompras.filter((i) => i.comprado).length} de {listaCompras.length} comprados</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Estimado</span>
              <span className="text-base font-extrabold text-[#d8492e]">${totalEstimadoSuper.toLocaleString('es-CL')}</span>
            </div>
          </div>
          <div className="space-y-2">
            {listaCompras.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">¡Todo en orden! No falta stock deseado.</p>
            ) : (
              listaCompras.map((item) => (
                <div key={item.id} onClick={() => setListaCompras(listaCompras.map(i => i.id === item.id ? {...i, comprado: !i.comprado} : i).sort((a,b)=>Number(a.comprado)-Number(b.comprado)))} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${item.comprado ? 'bg-gray-800/40 border-gray-700 text-gray-500 line-through' : darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-[#3f5228]/10 text-[#3f5228]'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${item.comprado ? 'bg-[#3f5228] border-[#3f5228] text-white' : 'border-gray-400'}`}>{item.comprado && <Check className="w-3.5 h-3.5" />}</div>
                    <div>
                      <span className="font-semibold text-sm block">{item.nombre}</span>
                      <span className="text-xs text-gray-400">Comprar: {item.cantidadComprar} {item.unidad}</span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-[#d8492e]">${(item.precio * item.cantidadComprar).toLocaleString('es-CL')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA 3: LISTA DISTINTA */}
      {activeTab === 'listaDistinta' && (
        <div className="space-y-4 flex-1">
          <div className={`flex justify-between items-center p-4 rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
            <div>
              <h2 className="text-sm font-bold">Lista Distinta (Libre)</h2>
              <p className="text-xs text-gray-400">{listaDistinta.filter(i => i.comprado).length} de {listaDistinta.length} comprados</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Total a Pagar</span>
              <span className="text-base font-extrabold text-orange-500">${totalDistinto.toLocaleString('es-CL')}</span>
            </div>
          </div>

          <form onSubmit={agregarAListaDistinta} className={`p-3 rounded-2xl shadow-sm border space-y-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <input type="text" placeholder="¿Qué necesitas comprar? (Ej. Papel higiénico...)" value={nuevoNombreDistinto} onChange={(e) => setNuevoNombreDistinto(e.target.value)} className={`w-full border rounded-xl p-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
            <div className="flex gap-2">
              <input type="number" placeholder="Cant." value={nuevoCantidadDistinto} onChange={(e) => setNuevoCantidadDistinto(e.target.value)} className={`w-20 border rounded-xl p-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
              <input type="number" placeholder="Precio ($)" value={nuevoPrecioDistinto} onChange={(e) => setNuevoPrecioDistinto(e.target.value)} className={`flex-1 border rounded-xl p-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
              <button type="submit" className="bg-orange-600 text-white px-4 rounded-xl font-bold text-sm">Agregar</button>
            </div>
          </form>

          <div className="space-y-2">
            {listaDistinta.map((item) => (
              <div key={item.id} onClick={() => setListaDistinta(listaDistinta.map(i => i.id === item.id ? {...i, comprado: !i.comprado} : i).sort((a,b)=>Number(a.comprado)-Number(b.comprado)))} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${item.comprado ? 'bg-gray-800/40 border-gray-700 text-gray-500 line-through' : darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-orange-100 text-[#3f5228]'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${item.comprado ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-400'}`}>{item.comprado && <Check className="w-3.5 h-3.5" />}</div>
                  <div>
                    <span className="font-semibold text-sm block">{item.nombre}</span>
                    <span className="text-xs text-gray-400">Cantidad: {item.cantidad}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-orange-500">${(item.precio * item.cantidad).toLocaleString('es-CL')}</span>
                  <button onClick={(e) => { e.stopPropagation(); setListaDistinta(listaDistinta.filter(i => i.id !== item.id)); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 4: GASTOS Y VALOR */}
      {activeTab === 'gastos' && (
        <div className="space-y-4 flex-1">
          <div className={`p-5 rounded-3xl shadow-sm border text-center space-y-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-green-200'}`}>
            <DollarSign className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="font-bold text-base">Valor Total de tu Inventario</h2>
            <p className="text-2xl font-extrabold text-green-600">${valorTotalInventario.toLocaleString('es-CL')}</p>
            <p className="text-xs text-gray-400">Este es el valor monetario estimado de todos los productos almacenados actualmente en tu despensa.</p>
          </div>
          <div className={`p-4 rounded-2xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold text-sm mb-2">Desglose rápido</h3>
            <p className="text-xs text-gray-400">Total de artículos registrados: <b>{productos.length} tipos de productos</b></p>
          </div>
        </div>
      )}

      {/* VISTA 5: FAVORITOS */}
      {activeTab === 'favoritos' && (
        <div className="space-y-3 flex-1">
          {productos.filter(p => p.favorito).length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No hay favoritos guardados.</p>
          ) : (
            productos.filter(p => p.favorito).map((prod) => (
              <div key={prod.id} className={`rounded-2xl p-4 flex items-center justify-between shadow-sm border ${darkMode ? 'bg-gray-800 border-yellow-500/30' : 'bg-white border-yellow-200'}`}>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <div>
                    <h3 className="font-bold">{prod.nombre}</h3>
                    <p className="text-xs text-gray-400">Stock: {prod.cantidad} {prod.unidad}</p>
                  </div>
                </div>
                <button onClick={() => prepararEdicion(prod)} className="p-2 text-green-600"><Edit2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA 6: CUADRÍCULA */}
      {activeTab === 'cuadricula' && (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {productos.map((prod) => (
            <div key={prod.id} className={`rounded-2xl p-3 shadow-sm border flex flex-col justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-green-400' : 'bg-gray-100 text-[#3f5228]'}`}>{prod.unidad}</span>
                  <button onClick={() => toggleFavorito(prod)}><Star className={`w-4 h-4 ${prod.favorito ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} /></button>
                </div>
                <h3 className="font-bold text-sm mt-2 line-clamp-1">{prod.nombre}</h3>
                <p className="text-xs text-gray-400 mt-1">Stock: <b>{prod.cantidad}</b></p>
              </div>
              <div className="mt-3 flex justify-between items-center pt-2 border-t border-gray-700/20">
                <span className="text-xs font-extrabold text-green-600">${prod.precio?.toLocaleString('es-CL')}</span>
                <button onClick={() => prepararEdicion(prod)} className="p-1 text-green-600"><Edit2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 7: AGREGAR / EDITAR */}
      {activeTab === 'agregar' && (
        <form onSubmit={handleGuardarProducto} className={`p-5 rounded-3xl shadow-sm space-y-3 border flex-1 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#3f5228]/20'}`}>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold">Nombre del Producto</label>
              <button type="button" onClick={() => setMostrarVoz(true)} className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:underline">
                <Mic className="w-3.5 h-3.5" /> Dictar Nombre
              </button>
            </div>
            <input type="text" placeholder="Ej. Leche Entera 1L" value={nombre} onChange={(e) => setNombre(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none mt-1 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold">Cantidad Actual</label>
              <input type="number" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm mt-1 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} required />
            </div>
            <div>
              <label className="text-xs font-bold">Unidad</label>
              <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm mt-1 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                <option value="Kg">Kg</option><option value="Litros">Litros</option><option value="Unidades">Unidades</option><option value="Gramos">Gramos</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold">Stock Deseado (Ideal)</label>
              <input type="number" step="any" placeholder="Ej. 5" value={stockDeseado} onChange={(e) => setStockDeseado(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm mt-1 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
            </div>
            <div>
              <label className="text-xs font-bold">Precio Unitario ($)</label>
              <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm mt-1 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} required />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold">Fecha de Vencimiento</label>
            <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm mt-1 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
          </div>
          <div className="flex gap-2 pt-3">
            {editandoId && <button type="button" onClick={() => { limpiarFormulario(); setActiveTab('inicio'); }} className="w-1/2 border border-gray-500 font-bold py-3 rounded-full text-sm">Cancelar</button>}
            <button type="submit" className="flex-1 bg-green-700 text-white font-bold py-3 rounded-full shadow-md text-sm hover:opacity-90">{editandoId ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {/* VISTA 8: REPORTES */}
      {activeTab === 'reportes' && (
        <div className={`p-6 rounded-3xl shadow-sm text-center space-y-4 border flex-1 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#3f5228]/25'}`}>
          <FileText className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="font-bold text-lg">Reporte de Inventario</h2>
          <button onClick={() => {
            const doc = new jsPDF();
            doc.text(`Reporte Despensa: ${codigoDespensa}`, 14, 20);
            doc.autoTable({ startY: 30, head: [['Producto', 'Stock', 'Precio']], body: productos.map(p => [p.nombre, `${p.cantidad} ${p.unidad}`, `$${p.precio}`]) });
            doc.save(`reporte-${codigoDespensa}.pdf`);
          }} className="w-full bg-green-700 text-white font-bold py-3 rounded-full text-sm">Descargar PDF</button>
        </div>
      )}

      {/* Menú Inferior */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t py-3 px-6 flex justify-around items-center z-40 max-w-md mx-auto shadow-lg ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <button onClick={() => setActiveTab('supermercado')} className={`flex flex-col items-center gap-1 ${activeTab === 'supermercado' ? 'text-orange-500 font-bold' : 'text-gray-400'}`}>
          <ShoppingCart className="w-5 h-5" /><span className="text-[10px]">Super</span>
        </button>
        <button onClick={() => setActiveTab('listaDistinta')} className={`flex flex-col items-center gap-1 ${activeTab === 'listaDistinta' ? 'text-orange-500 font-bold' : 'text-gray-400'}`}>
          <ListPlus className="w-5 h-5" /><span className="text-[10px]">Distinta</span>
        </button>
        <button onClick={() => { limpiarFormulario(); setActiveTab('agregar'); }} className="bg-green-700 text-white p-3 rounded-full shadow-lg -mt-6 hover:scale-105 transition">
          <Plus className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('favoritos')} className={`flex flex-col items-center gap-1 ${activeTab === 'favoritos' ? 'text-yellow-500 font-bold' : 'text-gray-400'}`}>
          <Star className="w-5 h-5" /><span className="text-[10px]">Favoritos</span>
        </button>
        <button onClick={() => setActiveTab('cuadricula')} className={`flex flex-col items-center gap-1 ${activeTab === 'cuadricula' ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
          <Grid className="w-5 h-5" /><span className="text-[10px]">Cuadrícula</span>
        </button>
      </nav>
    </main>
  );
}