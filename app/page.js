'use client';

import { useState, useEffect } from 'react';
import { Search, Menu, User, Plus, Trash2, FileText, AlertTriangle, Camera, Share2, ShoppingCart, Check, Edit2, Minus, Star, Grid, Box } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import AuthModal from '@/components/AuthModal';
import BarcodeScanner from '@/components/BarcodeScanner';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio' (inventario tarjetas), 'supermercado', 'favoritos', 'cuadricula', 'agregar'
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

  // Lista de Supermercado interactiva
  const [listaCompras, setListaCompras] = useState([]);

  // Mantener sesión abierta
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setMostrarAuthModal(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setMostrarAuthModal(true);
      } else {
        setMostrarAuthModal(false);
      }
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

    if (!error) {
      setProductos(data || []);
    }
  };

  // Generar automáticamente la lista de supermercado con lo que falta para llegar al stock deseado
  const generarListaSupermercadoAutomatica = (listaActualProductos) => {
    const lista = listaActualProductos
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
  };

  useEffect(() => {
    if (productos.length > 0) {
      generarListaSupermercadoAutomatica(productos);
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
      const { error } = await supabase.from('productos').update(productoData).eq('id', editandoId);
      if (!error) alert('¡Producto actualizado!');
    } else {
      const { error } = await supabase.from('productos').insert([productoData]);
      if (!error) alert('¡Producto agregado!');
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
    const { error } = await supabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
    if (!error) fetchProductos();
  };

  const toggleFavorito = async (prod) => {
    const nuevoFav = !prod.favorito;
    const { error } = await supabase.from('productos').update({ favorito: nuevoFav }).eq('id', prod.id);
    if (!error) fetchProductos();
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar producto?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (!error) fetchProductos();
  };

  const handleCodigoEscaneado = (codigo) => {
    setMostrarEscaner(false);
    if (modoEscaner === 'buscar') {
      const encontrado = productos.find((p) => p.codigo_barras === codigo);
      if (encontrado) {
        const accion = confirm(`Encontrado: "${encontrado.nombre}". ¿Deseas descontar 1 unidad?`);
        if (accion) {
          cambiarStock(encontrado.id, encontrado.cantidad, -1);
        } else {
          setBusqueda(encontrado.nombre);
        }
      } else {
        alert(`Código ${codigo} no registrado. Asócialo a un nuevo producto.`);
        setCodigoBarras(codigo);
        setActiveTab('agregar');
      }
    } else if (modoEscaner === 'vincular') {
      setCodigoBarras(codigo);
      setActiveTab('agregar');
    }
  };

  const toggleCompradoSuper = (id) => {
    setListaCompras((prev) => {
      const actualizada = prev.map((item) =>
        item.id === id ? { ...item, comprado: !item.comprado } : item
      );
      return actualizada.sort((a, b) => Number(a.comprado) - Number(b.comprado));
    });
  };

  const totalEstimadoSuper = listaCompras.reduce(
    (acc, item) => acc + (item.comprado ? 0 : item.precio * item.cantidadComprar),
    0
  );

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="w-full min-h-screen bg-despensa-bg pb-32 pt-4 px-3 flex flex-col font-sans">
      {mostrarAuthModal && (
        <AuthModal
          onLoginSuccess={(codigoAsignado) => {
            setCodigoDespensa(codigoAsignado);
            setMostrarAuthModal(false);
          }}
        />
      )}

      {mostrarEscaner && (
        <BarcodeScanner
          onScanSuccess={handleCodigoEscaneado}
          onClose={() => setMostrarEscaner(false)}
        />
      )}

      {/* Encabezado */}
      <header className="flex justify-between items-center mb-4 px-1 relative">
        <button
          onClick={() => setMostrarMenuDesplegable(!mostrarMenuDesplegable)}
          className="p-2 text-despensa-primary hover:bg-black/5 rounded-full"
        >
          <Menu className="w-7 h-7" />
        </button>

        {mostrarMenuDesplegable && (
          <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-despensa-primary/20 p-2 z-50 w-56 space-y-1">
            <button
              onClick={() => { setActiveTab('reportes'); setMostrarMenuDesplegable(false); }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-despensa-text hover:bg-despensa-bg rounded-xl flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-despensa-primary" /> Reportes PDF
            </button>
          </div>
        )}

        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="text-despensa-text font-bold text-xs">Despensa: </span>
            <input
              type="text"
              value={codigoDespensa}
              onChange={(e) => setCodigoDespensa(e.target.value)}
              className="bg-white/60 border border-despensa-primary/30 rounded px-2 py-0.5 text-xs font-semibold w-24 text-center"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            const mensaje = encodeURIComponent(`Únete a nuestra despensa compartida con el código: *${codigoDespensa}*`);
            window.open(`https://api.whatsapp.com/send?text=${mensaje}`, '_blank');
          }}
          className="p-2 text-despensa-primary hover:bg-black/5 rounded-full border border-despensa-primary/30"
          title="Compartir por WhatsApp"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      {/* Buscador y Lector */}
      {activeTab === 'inicio' && (
        <div className="relative mb-4 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border border-despensa-primary/30 rounded-full py-2.5 pl-12 pr-4 text-despensa-text placeholder-despensa-subtext focus:outline-none focus:ring-2 focus:ring-despensa-primary shadow-sm text-sm"
            />
            <Search className="w-5 h-5 text-despensa-primary absolute left-4 top-3" />
          </div>
          <button
            onClick={() => { setModoEscaner('buscar'); setMostrarEscaner(true); }}
            className="bg-despensa-primary text-white p-2.5 rounded-full shadow-sm hover:opacity-90 transition flex items-center justify-center"
            title="Escanear Código de Barras"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Título de Pestaña */}
      <div className="text-center mb-3">
        <h1 className="text-lg font-bold text-despensa-text">
          {activeTab === 'inicio' && 'Inventario General'}
          {activeTab === 'supermercado' && 'Lista de Supermercado'}
          {activeTab === 'favoritos' && 'Productos Favoritos'}
          {activeTab === 'cuadricula' && 'Vista de Cuadrícula'}
          {activeTab === 'agregar' && (editandoId ? 'Editar Producto' : 'Nuevo Producto')}
          {activeTab === 'reportes' && 'Reportes Financieros'}
        </h1>
      </div>

      {/* VISTA 1: INICIO (Lista completa detallada) */}
      {activeTab === 'inicio' && (
        <div className="space-y-3 flex-1">
          {productosFiltrados.length === 0 ? (
            <p className="text-center text-despensa-subtext text-sm py-10">No hay productos en esta despensa.</p>
          ) : (
            productosFiltrados.map((prod) => {
              const esCritico = prod.cantidad <= (prod.min || 1);
              return (
                <div
                  key={prod.id}
                  className={`rounded-2xl p-4 flex items-center justify-between shadow-sm border ${
                    esCritico ? 'bg-red-50 border-red-200' : 'bg-despensa-card border-transparent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleFavorito(prod)}>
                        <Star className={`w-4 h-4 ${prod.favorito ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                      </button>
                      <h3 className="font-bold text-despensa-text text-base">{prod.nombre}</h3>
                      {esCritico && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Bajo Stock
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Deseado: {prod.stock_deseado || prod.min || 1} {prod.unidad}</p>

                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center bg-white/90 rounded-lg border p-1 gap-2">
                        <button
                          onClick={() => cambiarStock(prod.id, prod.cantidad, -1)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600 font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-despensa-text">
                          {prod.cantidad} {prod.unidad}
                        </span>
                        <button
                          onClick={() => cambiarStock(prod.id, prod.cantidad, 1)}
                          className="p-1 hover:bg-gray-100 rounded text-green-600 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-despensa-text">
                        ${prod.precio?.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => prepararEdicion(prod)}
                      className="p-2 text-despensa-primary hover:bg-black/5 rounded-full"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(prod.id)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VISTA 2: SUPERMERCADO (Automática por stock faltante) */}
      {activeTab === 'supermercado' && (
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-despensa-primary/20">
            <div>
              <h2 className="text-sm font-bold text-despensa-text">Faltantes para Stock Deseado</h2>
              <p className="text-xs text-despensa-subtext">
                {listaCompras.filter((i) => i.comprado).length} de {listaCompras.length} comprados
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Estimado</span>
              <span className="text-base font-extrabold text-[#d8492e]">${totalEstimadoSuper.toLocaleString('es-CL')}</span>
            </div>
          </div>

          <div className="space-y-2">
            {listaCompras.length === 0 ? (
              <p className="text-center text-despensa-subtext text-sm py-10">
                ¡Estás al día! No hay productos por debajo de tu stock deseado.
              </p>
            ) : (
              listaCompras.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCompradoSuper(item.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${
                    item.comprado
                      ? 'bg-gray-100/80 border-gray-200 text-gray-400 line-through'
                      : 'bg-white border-despensa-primary/10 text-despensa-text shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${item.comprado ? 'bg-despensa-primary border-despensa-primary text-white' : 'border-gray-400'}`}>
                      {item.comprado && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="font-semibold text-sm block">{item.nombre}</span>
                      <span className="text-xs text-gray-500">Comprar: {item.cantidadComprar} {item.unidad}</span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-[#d8492e]">
                    ${(item.precio * item.cantidadComprar).toLocaleString('es-CL')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA 3: FAVORITOS */}
      {activeTab === 'favoritos' && (
        <div className="space-y-3 flex-1">
          {productos.filter(p => p.favorito).length === 0 ? (
            <p className="text-center text-despensa-subtext text-sm py-10">No tienes productos marcados como favoritos. Toca la estrella en el inventario.</p>
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
                <button onClick={() => prepararEdicion(prod)} className="p-2 text-despensa-primary">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA 4: CUADRÍCULA (Iconos/Tarjetas visuales) */}
      {activeTab === 'cuadricula' && (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {productos.length === 0 ? (
            <p className="col-span-2 text-center text-despensa-subtext text-sm py-10">No hay productos para mostrar.</p>
          ) : (
            productos.map((prod) => (
              <div key={prod.id} className="bg-white rounded-2xl p-3 shadow-sm border border-despensa-primary/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="bg-despensa-bg text-despensa-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{prod.unidad}</span>
                    <button onClick={() => toggleFavorito(prod)}>
                      <Star className={`w-4 h-4 ${prod.favorito ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    </button>
                  </div>
                  <h3 className="font-bold text-despensa-text text-sm mt-2 line-clamp-1">{prod.nombre}</h3>
                  <p className="text-xs text-gray-500 mt-1">Stock: <b>{prod.cantidad}</b></p>
                </div>
                <div className="mt-3 flex justify-between items-center pt-2 border-t">
                  <span className="text-xs font-extrabold text-despensa-text">${prod.precio?.toLocaleString('es-CL')}</span>
                  <button onClick={() => prepararEdicion(prod)} className="p-1 text-despensa-primary">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA 5: AGREGAR / EDITAR PRODUCTO */}
      {activeTab === 'agregar' && (
        <form onSubmit={handleGuardarProducto} className="bg-white p-5 rounded-3xl shadow-sm space-y-3 border border-despensa-primary/20 flex-1">
          <div>
            <label className="text-xs font-bold text-despensa-text">Nombre del Producto</label>
            <input
              type="text"
              placeholder="Ej. Leche Entera 1L"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm outline-none mt-1"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-despensa-text">Código de Barras</label>
              <button
                type="button"
                onClick={() => { setModoEscaner('vincular'); setMostrarEscaner(true); }}
                className="text-xs text-despensa-primary font-semibold flex items-center gap-1 hover:underline"
              >
                <Camera className="w-3.5 h-3.5" /> Escanear Código
              </button>
            </div>
            <input
              type="text"
              placeholder="Código detectado"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              className="w-full border rounded-xl p-2 text-xs bg-gray-50 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-despensa-text">Cantidad Actual</label>
              <input
                type="number"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-despensa-text">Unidad</label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 bg-white outline-none"
              >
                <option value="Kg">Kg</option>
                <option value="Litros">Litros</option>
                <option value="Unidades">Unidades</option>
                <option value="Gramos">Gramos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-despensa-text">Stock Deseado (Ideal)</label>
              <input
                type="number"
                step="any"
                placeholder="Ej. 5"
                value={stockDeseado}
                onChange={(e) => setStockDeseado(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-despensa-text">Precio Unitario ($)</label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            {editandoId && (
              <button
                type="button"
                onClick={() => { limpiarFormulario(); setActiveTab('inicio'); }}
                className="w-1/2 border border-gray-300 font-bold py-3 rounded-full text-sm"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-despensa-primary text-white font-bold py-3 rounded-full shadow-md text-sm"
            >
              {editandoId ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      )}

      {/* VISTA 6: REPORTES */}
      {activeTab === 'reportes' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center space-y-4 border border-despensa-primary/25 flex-1">
          <FileText className="w-16 h-16 text-despensa-primary mx-auto" />
          <h2 className="font-bold text-despensa-text text-lg">Reporte de Inventario</h2>
          <p className="text-xs text-despensa-subtext">Descarga el reporte detallado con costos y stock actual.</p>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              doc.text(`Reporte Despensa: ${codigoDespensa}`, 14, 20);
              const data = productos.map(p => [p.nombre, `${p.cantidad} ${p.unidad}`, `$${p.precio}`]);
              doc.autoTable({ startY: 30, head: [['Producto', 'Stock', 'Precio']], body: data });
              doc.save(`reporte-${codigoDespensa}.pdf`);
            }}
            className="w-full bg-despensa-primary text-white font-bold py-3 rounded-full shadow-md text-sm"
          >
            Descargar PDF
          </button>
        </div>
      )}

      {/* Menú de Navegación Inferior Actualizado */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex justify-around items-center z-40 max-w-md mx-auto shadow-lg">
        <button
          onClick={() => setActiveTab('supermercado')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'supermercado' ? 'text-despensa-accent font-bold' : 'text-gray-400'}`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px]">Super</span>
        </button>

        <button
          onClick={() => setActiveTab('inicio')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'inicio' ? 'text-despensa-primary font-bold' : 'text-gray-400'}`}
        >
          <Box className="w-5 h-5" />
          <span className="text-[10px]">Inventario</span>
        </button>

        <button
          onClick={() => { limpiarFormulario(); setActiveTab('agregar'); }}
          className="bg-despensa-primary text-white p-3 rounded-full shadow-lg -mt-6 hover:scale-105 transition"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('favoritos')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'favoritos' ? 'text-yellow-500 font-bold' : 'text-gray-400'}`}
        >
          <Star className="w-5 h-5" />
          <span className="text-[10px]">Favoritos</span>
        </button>

        <button
          onClick={() => setActiveTab('cuadricula')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'cuadricula' ? 'text-despensa-primary font-bold' : 'text-gray-400'}`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px]">Cuadrícula</span>
        </button>
      </nav>
    </main>
  );
}