'use client';

import { useState, useEffect } from 'react';
import { Search, Menu, User, Plus, Trash2, FileText, AlertTriangle, Camera, Share2, ShoppingCart, Check, Edit2, Minus, Star, Grid, Box, ListPlus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import AuthModal from '@/components/AuthModal';
import BarcodeScanner from '@/components/BarcodeScanner';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'supermercado', 'listaDistinta', 'favoritos', 'cuadricula', 'agregar'
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [codigoDespensa, setCodigoDespensa] = useState('CASA-123');
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [modoEscaner, setModoEscaner] = useState('buscar');

  const [mostrarAuthModal, setMostrarAuthModal] = useState(false);
  const [mostrarMenuDesplegable, setMostrarMenuDesplegable] = useState(false);

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
    id: 1, nombre: 'Carbón para asado', cantidad: 2, precio: 5000, comprado: false 
  ]);
  const [nuevoNombreDistinto, setNuevoNombreDistinto] = useState('');
  const [nuevoCantidadDistinto, setNuevoCantidadDistinto] = useState('1');
  const [nuevoPrecioDistinto, setNuevoPrecioDistinto] = useState('');

  // Mantener sesión abierta
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setMostrarAuthModal(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setMostrarAuthModal(!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (codigoDespensa) fetchProductos();
  }, [codigoDespensa]);

  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('despensa_codigo', codigoDespensa);

    if (!error) setProductos(data || []);
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

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !cantidad || !precio) return alert('Completa los campos obligatorios');

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
    };

    if (editandoId) {
      await supabase.from('productos').update(productoData).eq('id', editandoId);
    } else {
      await supabase.from('productos').insert([productoData]);
    }

    limpiarFormulario();
    fetchProductos();
    setActiveTab('inicio');
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

  // Funciones para la "Lista Distinta"
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

  const toggleCompradoDistinto = (id) => {
    setListaDistinta((prev) => {
      const actualizada = prev.map((item) =>
        item.id === id ? { ...item, comprado: !item.comprado } : item
      );
      return actualizada.sort((a, b) => Number(a.comprado) - Number(b.comprado));
    });
  };

  const eliminarItemDistinto = (id) => {
    setListaDistinta(listaDistinta.filter(i => i.id !== id));
  };

  const totalDistinto = listaDistinta.reduce((acc, item) => acc + (item.comprado ? 0 : item.precio * item.cantidad), 0);
  const totalEstimadoSuper = listaCompras.reduce((acc, item) => acc + (item.comprado ? 0 : item.precio * item.cantidadComprar), 0);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="w-full min-h-screen bg-despensa-bg pb-32 pt-4 px-3 flex flex-col font-sans">
      {mostrarAuthModal && <AuthModal onLoginSuccess={(code) => { setCodigoDespensa(code); setMostrarAuthModal(false); }} />}
      {mostrarEscaner && <BarcodeScanner onScanSuccess={(code) => { setCodigoBarras(code); setMostrarEscaner(false); setActiveTab('agregar'); }} onClose={() => setMostrarEscaner(false)} />}

      {/* Encabezado */}
      <header className="flex justify-between items-center mb-4 px-1 relative">
        <button onClick={() => setMostrarMenuDesplegable(!mostrarMenuDesplegable)} className="p-2 text-despensa-primary hover:bg-black/5 rounded-full">
          <Menu className="w-7 h-7" />
        </button>

        {mostrarMenuDesplegable && (
          <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-despensa-primary/20 p-2 z-50 w-56 space-y-1">
            <button onClick={() => { setActiveTab('listaDistinta'); setMostrarMenuDesplegable(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-despensa-text hover:bg-despensa-bg rounded-xl flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-despensa-accent" /> Lista Distinta (Personalizada)
            </button>
            <button onClick={() => { setActiveTab('reportes'); setMostrarMenuDesplegable(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-despensa-text hover:bg-despensa-bg rounded-xl flex items-center gap-2">
              <FileText className="w-4 h-4 text-despensa-primary" /> Reportes PDF
            </button>
          </div>
        )}

        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="text-despensa-text font-bold text-xs">Despensa: </span>
            <input type="text" value={codigoDespensa} onChange={(e) => setCodigoDespensa(e.target.value)} className="bg-white/60 border border-despensa-primary/30 rounded px-2 py-0.5 text-xs font-semibold w-24 text-center" />
          </div>
        </div>

        <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Únete a nuestra despensa con el código: *${codigoDespensa}*`)}`, '_blank')} className="p-2 text-despensa-primary hover:bg-black/5 rounded-full border border-despensa-primary/30">
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      {/* Buscador */}
      {activeTab === 'inicio' && (
        <div className="relative mb-4 flex gap-2">
          <div className="relative flex-1">
            <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-white border border-despensa-primary/30 rounded-full py-2.5 pl-12 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-despensa-primary" />
            <Search className="w-5 h-5 text-despensa-primary absolute left-4 top-3" />
          </div>
          <button onClick={() => { setModoEscaner('buscar'); setMostrarEscaner(true); }} className="bg-despensa-primary text-white p-2.5 rounded-full shadow-sm">
            <Camera className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Título de Pestaña */}
      <div className="text-center mb-3">
        <h1 className="text-lg font-bold text-despensa-text">
          {activeTab === 'inicio' && 'Inventario General'}
          {activeTab === 'supermercado' && 'Supermercado (Stock Faltante)'}
          {activeTab === 'listaDistinta' && 'Lista Distinta (Personalizada)'}
          {activeTab === 'favoritos' && 'Productos Favoritos'}
          {activeTab === 'cuadricula' && 'Vista de Cuadrícula'}
          {activeTab === 'agregar' && (editandoId ? 'Editar Producto' : 'Nuevo Producto')}
          {activeTab === 'reportes' && 'Reportes Financieros'}
        </h1>
      </div>

      {/* VISTA 1: INICIO */}
      {activeTab === 'inicio' && (
        <div className="space-y-3 flex-1">
          {productosFiltrados.length === 0 ? (
            <p className="text-center text-despensa-subtext text-sm py-10">No hay productos en esta despensa.</p>
          ) : (
            productosFiltrados.map((prod) => {
              const esCritico = prod.cantidad <= (prod.min || 1);
              return (
                <div key={prod.id} className={`rounded-2xl p-4 flex items-center justify-between shadow-sm border ${esCritico ? 'bg-red-50 border-red-200' : 'bg-despensa-card border-transparent'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleFavorito(prod)}><Star className={`w-4 h-4 ${prod.favorito ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} /></button>
                      <h3 className="font-bold text-despensa-text text-base">{prod.nombre}</h3>
                      {esCritico && <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Bajo Stock</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Deseado: {prod.stock_deseado || prod.min || 1} {prod.unidad}</p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center bg-white/90 rounded-lg border p-1 gap-2">
                        <button onClick={() => cambiarStock(prod.id, prod.cantidad, -1)} className="p-1 hover:bg-gray-100 rounded text-red-600 font-bold"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-xs font-bold text-despensa-text">{prod.cantidad} {prod.unidad}</span>
                        <button onClick={() => cambiarStock(prod.id, prod.cantidad, 1)} className="p-1 hover:bg-gray-100 rounded text-green-600 font-bold"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <span className="text-sm font-extrabold text-despensa-text">${prod.precio?.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => prepararEdicion(prod)} className="p-2 text-despensa-primary rounded-full"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleEliminar(prod.id)} className="p-2 text-red-500 rounded-full"><Trash2 className="w-4 h-4" /></button>
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
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-despensa-primary/20">
            <div>
              <h2 className="text-sm font-bold text-despensa-text">Faltantes de Inventario</h2>
              <p className="text-xs text-despensa-subtext">{listaCompras.filter((i) => i.comprado).length} de {listaCompras.length} comprados</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Estimado</span>
              <span className="text-base font-extrabold text-[#d8492e]">${totalEstimadoSuper.toLocaleString('es-CL')}</span>
            </div>
          </div>
          <div className="space-y-2">
            {listaCompras.length === 0 ? (
              <p className="text-center text-despensa-subtext text-sm py-10">¡Todo en orden! No falta stock deseado.</p>
            ) : (
              listaCompras.map((item) => (
                <div key={item.id} onClick={() => setListaCompras(listaCompras.map(i => i.id === item.id ? {...i, comprado: !i.comprado} : i).sort((a,b)=>Number(a.comprado)-Number(b.comprado)))} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${item.comprado ? 'bg-gray-100/80 border-gray-200 text-gray-400 line-through' : 'bg-white border-despensa-primary/10 text-despensa-text shadow-sm'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${item.comprado ? 'bg-despensa-primary border-despensa-primary text-white' : 'border-gray-400'}`}>{item.comprado && <Check className="w-3.5 h-3.5" />}</div>
                    <div>
                      <span className="font-semibold text-sm block">{item.nombre}</span>
                      <span className="text-xs text-gray-500">Comprar: {item.cantidadComprar} {item.unidad}</span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-[#d8492e]">${(item.precio * item.cantidadComprar).toLocaleString('es-CL')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA 3: LISTA DISTINTA (PERSONALIZADA) */}
      {activeTab === 'listaDistinta' && (
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-despensa-accent/30">
            <div>
              <h2 className="text-sm font-bold text-despensa-text">Lista Distinta (Libre)</h2>
              <p className="text-xs text-despensa-subtext">{listaDistinta.filter(i => i.comprado).length} de {listaDistinta.length} comprados</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Total a Pagar</span>
              <span className="text-base font-extrabold text-despensa-accent">${totalDistinto.toLocaleString('es-CL')}</span>
            </div>
          </div>

          <form onSubmit={agregarAListaDistinta} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 space-y-2">
            <input type="text" placeholder="¿Qué necesitas comprar? (Ej. Papel higiénico, Regalo...)" value={nuevoNombreDistinto} onChange={(e) => setNuevoNombreDistinto(e.target.value)} className="w-full border rounded-xl p-2 text-sm outline-none" />
            <div className="flex gap-2">
              <input type="number" placeholder="Cant." value={nuevoCantidadDistinto} onChange={(e) => setNuevoCantidadDistinto(e.target.value)} className="w-20 border rounded-xl p-2 text-sm outline-none" />
              <input type="number" placeholder="Precio ($)" value={nuevoPrecioDistinto} onChange={(e) => setNuevoPrecioDistinto(e.target.value)} className="flex-1 border rounded-xl p-2 text-sm outline-none" />
              <button type="submit" className="bg-despensa-accent text-white px-4 rounded-xl font-bold text-sm">Agregar</button>
            </div>
          </form>

          <div className="space-y-2">
            {listaDistinta.map((item) => (
              <div key={item.id} onClick={() => toggleCompradoDistinto(item.id)} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${item.comprado ? 'bg-gray-100/80 border-gray-200 text-gray-400 line-through' : 'bg-white border-despensa-accent/20 text-despensa-text shadow-sm'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${item.comprado ? 'bg-despensa-accent border-despensa-accent text-white' : 'border-gray-400'}`}>{item.comprado && <Check className="w-3.5 h-3.5" />}</div>
                  <div>
                    <span className="font-semibold text-sm block">{item.nombre}</span>
                    <span className="text-xs text-gray-500">Cantidad: {item.cantidad}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-despensa-accent">${(item.precio * item.cantidad).toLocaleString('es-CL')}</span>
                  <button onClick={(e) => { e.stopPropagation(); eliminarItemDistinto(item.id); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 4: FAVORITOS */}
      {activeTab === 'favoritos' && (
        <div className="space-y-3 flex-1">
          {productos.filter(p => p.favorito).length === 0 ? (
            <p className="text-center text-despensa-subtext text-sm py-10">No hay favoritos guardados.</p>
          ) : (
            productos.filter(p => p.favorito).map((prod) => (
              <div key={prod.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-yellow-200">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <div>
                    <h3 className="font-bold text-despensa-text">{prod.nombre}</h3>
                    <p className="text-xs text-gray-500">Stock: {prod.cantidad} {prod.unidad}</p>
                  </div>
                </div>
                <button onClick={() => prepararEdicion(prod)} className="p-2 text-despensa-primary"><Edit2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA 5: CUADRÍCULA */}
      {activeTab === 'cuadricula' && (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {productos.map((prod) => (
            <div key={prod.id} className="bg-white rounded-2xl p-3 shadow-sm border border-despensa-primary/10 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="bg-despensa-bg text-despensa-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{prod.unidad}</span>
                  <button onClick={() => toggleFavorito(prod)}><Star className={`w-4 h-4 ${prod.favorito ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} /></button>
                </div>
                <h3 className="font-bold text-despensa-text text-sm mt-2 line-clamp-1">{prod.nombre}</h3>
                <p className="text-xs text-gray-500 mt-1">Stock: <b>{prod.cantidad}</b></p>
              </div>
              <div className="mt-3 flex justify-between items-center pt-2 border-t">
                <span className="text-xs font-extrabold text-despensa-text">${prod.precio?.toLocaleString('es-CL')}</span>
                <button onClick={() => prepararEdicion(prod)} className="p-1 text-despensa-primary"><Edit2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 6: AGREGAR / EDITAR */}
      {activeTab === 'agregar' && (
        <form onSubmit={handleGuardarProducto} className="bg-white p-5 rounded-3xl shadow-sm space-y-3 border border-despensa-primary/20 flex-1">
          <div>
            <label className="text-xs font-bold text-despensa-text">Nombre del Producto</label>
            <input type="text" placeholder="Ej. Leche Entera 1L" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm outline-none mt-1" required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-despensa-text">Código de Barras</label>
              <button type="button" onClick={() => { setModoEscaner('vincular'); setMostrarEscaner(true); }} className="text-xs text-despensa-primary font-semibold flex items-center gap-1 hover:underline"><Camera className="w-3.5 h-3.5" /> Escanear</button>
            </div>
            <input type="text" placeholder="Código detectado" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className="w-full border rounded-xl p-2 text-xs bg-gray-50 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-despensa-text">Cantidad Actual</label>
              <input type="number" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none" required />
            </div>
            <div>
              <label className="text-xs font-bold text-despensa-text">Unidad</label>
              <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1 bg-white outline-none">
                <option value="Kg">Kg</option><option value="Litros">Litros</option><option value="Unidades">Unidades</option><option value="Gramos">Gramos</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-despensa-text">Stock Deseado (Ideal)</label>
              <input type="number" step="any" placeholder="Ej. 5" value={stockDeseado} onChange={(e) => setStockDeseado(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-despensa-text">Precio Unitario ($)</label>
              <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none" required />
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            {editandoId && <button type="button" onClick={() => { limpiarFormulario(); setActiveTab('inicio'); }} className="w-1/2 border border-gray-300 font-bold py-3 rounded-full text-sm">Cancelar</button>}
            <button type="submit" className="flex-1 bg-despensa-primary text-white font-bold py-3 rounded-full shadow-md text-sm">{editandoId ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {/* VISTA 7: REPORTES */}
      {activeTab === 'reportes' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center space-y-4 border border-despensa-primary/25 flex-1">
          <FileText className="w-16 h-16 text-despensa-primary mx-auto" />
          <h2 className="font-bold text-despensa-text text-lg">Reporte de Inventario</h2>
          <button onClick={() => {
            const doc = new jsPDF();
            doc.text(`Reporte Despensa: ${codigoDespensa}`, 14, 20);
            doc.autoTable({ startY: 30, head: [['Producto', 'Stock', 'Precio']], body: productos.map(p => [p.nombre, `${p.cantidad} ${p.unidad}`, `$${p.precio}`]) });
            doc.save(`reporte-${codigoDespensa}.pdf`);
          }} className="w-full bg-despensa-primary text-white font-bold py-3 rounded-full text-sm">Descargar PDF</button>
        </div>
      )}

      {/* Menú Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex justify-around items-center z-40 max-w-md mx-auto shadow-lg">
        <button onClick={() => setActiveTab('supermercado')} className={`flex flex-col items-center gap-1 ${activeTab === 'supermercado' ? 'text-despensa-accent font-bold' : 'text-gray-400'}`}>
          <ShoppingCart className="w-5 h-5" /><span className="text-[10px]">Super</span>
        </button>
        <button onClick={() => setActiveTab('listaDistinta')} className={`flex flex-col items-center gap-1 ${activeTab === 'listaDistinta' ? 'text-despensa-accent font-bold' : 'text-gray-400'}`}>
          <ListPlus className="w-5 h-5" /><span className="text-[10px]">Distinta</span>
        </button>
        <button onClick={() => { limpiarFormulario(); setActiveTab('agregar'); }} className="bg-despensa-primary text-white p-3 rounded-full shadow-lg -mt-6 hover:scale-105 transition">
          <Plus className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('favoritos')} className={`flex flex-col items-center gap-1 ${activeTab === 'favoritos' ? 'text-yellow-500 font-bold' : 'text-gray-400'}`}>
          <Star className="w-5 h-5" /><span className="text-[10px]">Favoritos</span>
        </button>
        <button onClick={() => setActiveTab('cuadricula')} className={`flex flex-col items-center gap-1 ${activeTab === 'cuadricula' ? 'text-despensa-primary font-bold' : 'text-gray-400'}`}>
          <Grid className="w-5 h-5" /><span className="text-[10px]">Cuadrícula</span>
        </button>
      </nav>
    </main>
  );
}