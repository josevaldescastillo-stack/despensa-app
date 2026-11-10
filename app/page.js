'use client';

import { useState, useEffect } from 'react';
import { Search, Menu, User, Plus, Trash2, FileText, AlertTriangle, Camera, Share2, ShoppingCart, Check, Edit2, Minus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import AuthModal from '@/components/AuthModal';
import BarcodeScanner from '@/components/BarcodeScanner';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [codigoDespensa, setCodigoDespensa] = useState('CASA-123');
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [modoEscaner, setModoEscaner] = useState('buscar'); // 'buscar', 'agregar', 'vincular'

  const [mostrarAuthModal, setMostrarAuthModal] = useState(true);
  const [mostrarMenuDesplegable, setMostrarMenuDesplegable] = useState(false);

  // Estados para Edición y Formulario
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('Kg');
  const [cantidad, setCantidad] = useState('');
  const [min, setMin] = useState('');
  const [precio, setPrecio] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');

  // Lista de Supermercado
  const [listaCompras, setListaCompras] = useState([]);
  const [nuevoItemSuper, setNuevoItemSuper] = useState('');

  useEffect(() => {
    fetchProductos();
  }, [codigoDespensa]);

  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('despensa_codigo', codigoDespensa);

    if (!error) setProductos(data || []);
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !cantidad || !precio) return alert('Completa los campos obligatorios');

    const productoData = {
      nombre,
      unidad,
      cantidad: parseFloat(cantidad),
      min: parseFloat(min || 0),
      precio: parseFloat(precio),
      vencimiento: vencimiento || null,
      codigo_barras: codigoBarras || null,
      despensa_codigo: codigoDespensa,
    };

    if (editandoId) {
      const { error } = await supabase.from('productos').update(productoData).eq('id', editandoId);
      if (!error) alert('¡Producto actualizado con éxito!');
    } else {
      const { error } = await supabase.from('productos').insert([productoData]);
      if (!error) alert('¡Producto agregado con éxito!');
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
    setPrecio('');
    setVencimiento('');
    setCodigoBarras('');
  };

  const cambiarStock = async (id, cantidadActual, delta) => {
    const nuevaCantidad = Math.max(0, cantidadActual + delta);
    const { error } = await supabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
    if (!error) fetchProductos();
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (!error) fetchProductos();
  };

  const handleCodigoEscaneado = async (codigo) => {
    setMostrarEscaner(false);

    if (modoEscaner === 'buscar') {
      const encontrado = productos.find((p) => p.codigo_barras === codigo);
      if (encontrado) {
        const accion = confirm(`Producto encontrado: "${encontrado.nombre}" (Stock: ${encontrado.cantidad}). ¿Deseas descontar 1 unidad?`);
        if (accion) {
          cambiarStock(encontrado.id, encontrado.cantidad, -1);
        } else {
          setBusqueda(encontrado.nombre);
        }
      } else {
        alert(`Código ${codigo} no vinculado. Puedes vincularlo al agregar o editar un producto.`);
        setCodigoBarras(codigo);
        setActiveTab('agregar');
      }
    } else if (modoEscaner === 'vincular') {
      setCodigoBarras(codigo);
    }
  };

  // Lista de Supermercado
  const agregarItemSupermercado = () => {
    if (!nuevoItemSuper.trim()) return;
    setListaCompras((prev) => [
      ...prev,
      { id: Date.now(), nombre: nuevoItemSuper, precio: 0, comprado: false, cantidad: 1 },
    ]);
    setNuevoItemSuper('');
  };

  const generarListaSuper = () => {
    const productosLista = productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio || 0,
      comprado: false,
      cantidad: 1,
    }));
    setListaCompras(productosLista);
    setActiveTab('supermercado');
    setMostrarMenuDesplegable(false);
  };

  const toggleComprado = (id) => {
    setListaCompras((prev) => {
      const actualizada = prev.map((item) =>
        item.id === id ? { ...item, comprado: !item.comprado } : item
      );
      return actualizada.sort((a, b) => Number(a.comprado) - Number(b.comprado));
    });
  };

  const totalEstimado = listaCompras.reduce(
    (acc, item) => acc + (item.comprado ? 0 : item.precio * item.cantidad),
    0
  );

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-despensa-bg pb-28 pt-4 px-4 max-w-md mx-auto relative shadow-2xl rounded-3xl overflow-hidden font-sans">
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
      <header className="flex justify-between items-center mb-4 px-2 relative">
        <button
          onClick={() => setMostrarMenuDesplegable(!mostrarMenuDesplegable)}
          className="p-2 text-despensa-primary hover:bg-black/5 rounded-full"
        >
          <Menu className="w-7 h-7" />
        </button>

        {mostrarMenuDesplegable && (
          <div className="absolute top-12 left-2 bg-white rounded-2xl shadow-xl border border-despensa-primary/20 p-2 z-50 w-56 space-y-1">
            <button
              onClick={() => { setActiveTab('supermercado'); setMostrarMenuDesplegable(false); }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-despensa-text hover:bg-despensa-bg rounded-xl flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-despensa-primary" /> Lista de Supermercado
            </button>
            <button
              onClick={generarListaSuper}
              className="w-full text-left px-3 py-2 text-xs text-despensa-subtext hover:bg-despensa-bg rounded-xl flex items-center gap-2 pl-7"
            >
              ↻ Cargar desde Inventario
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
        <button className="p-2 text-despensa-primary hover:bg-black/5 rounded-full border border-despensa-primary/30">
          <User className="w-6 h-6" />
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
            title="Escanear Código / Restar Stock"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* VISTA INICIO: Lista de Inventario */}
      {activeTab === 'inicio' && (
        <div className="space-y-3 mb-6">
          {productosFiltrados.length === 0 ? (
            <p className="text-center text-despensa-subtext text-sm py-10">No hay productos guardados.</p>
          ) : (
            productosFiltrados.map((prod) => {
              const esCritico = prod.cantidad <= prod.min;
              return (
                <div
                  key={prod.id}
                  className={`rounded-2xl p-4 flex items-center justify-between shadow-sm relative border ${
                    esCritico ? 'bg-red-50 border-red-200' : 'bg-despensa-card border-transparent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-despensa-text text-base">{prod.nombre}</h3>
                      {esCritico && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stock Bajo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center bg-white/80 rounded-lg border p-1 gap-2">
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

                      <span className="text-base font-extrabold text-despensa-text">
                        ${prod.precio?.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => prepararEdicion(prod)}
                      className="p-2 text-despensa-primary hover:bg-black/5 rounded-full transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(prod.id)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"
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

      {/* VISTA AGREGAR / EDITAR */}
      {activeTab === 'agregar' && (
        <form onSubmit={handleGuardarProducto} className="bg-white p-5 rounded-3xl shadow-sm space-y-3 border border-despensa-primary/20">
          <h2 className="font-bold text-base text-despensa-text mb-2">
            {editandoId ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>

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
              <label className="text-xs font-bold text-despensa-text">Código de Barra Vinculado</label>
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
              placeholder="Escanea o escribe el código"
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
              <label className="text-xs font-bold text-despensa-text">Stock Mínimo</label>
              <input
                type="number"
                step="any"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-despensa-text">Precio ($)</label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
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
              {editandoId ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      )}

      {/* VISTA SUPERMERCADO */}
      {activeTab === 'supermercado' && (
        <div className="space-y-4 pb-10">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-despensa-primary/20">
            <div>
              <h2 className="text-sm font-bold text-despensa-text">Lista de Supermercado</h2>
              <p className="text-xs text-despensa-subtext">
                {listaCompras.filter((i) => i.comprado).length} de {listaCompras.length} comprados
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Estimado</span>
              <span className="text-base font-extrabold text-[#d8492e]">${totalEstimado.toLocaleString('es-CL')}</span>
            </div>
          </div>

          {/* Input para agregar producto a la lista manualmente */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Agregar a la lista de compras..."
              value={nuevoItemSuper}
              onChange={(e) => setNuevoItemSuper(e.target.value)}
              className="flex-1 bg-white border border-despensa-primary/30 rounded-xl px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={agregarItemSupermercado}
              className="bg-despensa-primary text-white px-4 rounded-xl font-bold text-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {listaCompras.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleComprado(item.id)}
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
                  <span className="font-semibold text-sm">{item.nombre}</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs font-medium text-despensa-subtext">$</span>
                  <input
                    type="number"
                    value={item.precio}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setListaCompras((prev) =>
                        prev.map((i) => (i.id === item.id ? { ...i, precio: val } : i))
                      );
                    }}
                    className="w-20 p-1 text-right text-xs border rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-despensa-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón Flotante */}
      <button
        onClick={() => { limpiarFormulario(); setActiveTab('agregar'); }}
        className="fixed bottom-24 right-6 bg-despensa-primary text-white p-4 rounded-full shadow-2xl hover:opacity-90 transition flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}