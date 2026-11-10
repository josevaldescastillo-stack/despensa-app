'use client';

import { useState, useEffect } from 'react';
import { Search, Menu, User, Plus, Trash2, FileText, AlertTriangle, Camera, Share2, ShoppingCart, Check, X } from 'lucide-react';
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
  const [modoEscaner, setModoEscaner] = useState('buscar');

  const [mostrarAuthModal, setMostrarAuthModal] = useState(true);

  // Estados para la Lista de Supermercado y Menú Desplegable
  const [mostrarMenuDesplegable, setMostrarMenuDesplegable] = useState(false);
  const [listaCompras, setListaCompras] = useState([]);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('Kg');
  const [cantidad, setCantidad] = useState('');
  const [min, setMin] = useState('');
  const [precio, setPrecio] = useState('');
  const [vencimiento, setVencimiento] = useState('');

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

  const handleAgregarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !cantidad || !precio) return alert('Por favor completa los campos obligatorios');

    const { error } = await supabase.from('productos').insert([
      {
        nombre,
        unidad,
        cantidad: parseFloat(cantidad),
        min: parseFloat(min || 0),
        precio: parseFloat(precio),
        vencimiento: vencimiento || null,
        despensa_codigo: codigoDespensa,
      },
    ]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setNombre('');
      setCantidad('');
      setMin('');
      setPrecio('');
      setVencimiento('');
      fetchProductos();
      setActiveTab('inicio');
      alert('¡Producto agregado con éxito a la Despensa!');
    }
  };

  const handleEliminar = async (id) => {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (!error) fetchProductos();
  };

  const handleCodigoEscaneado = (codigo) => {
    setMostrarEscaner(false);
    if (modoEscaner === 'buscar') {
      setBusqueda(codigo);
    } else if (modoEscaner === 'agregar') {
      setNombre(`Producto (${codigo})`);
    }
  };

  // Función para generar la Lista de Supermercado desde los productos actuales
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

  // Marcar como comprado y ordenar al final
  const toggleComprado = (id) => {
    setListaCompras((prev) => {
      const actualizada = prev.map((item) =>
        item.id === id ? { ...item, comprado: !item.comprado } : item
      );
      return actualizada.sort((a, b) => Number(a.comprado) - Number(b.comprado));
    });
  };

  // Calcular total de la lista de supermercado
  const totalEstimado = listaCompras.reduce(
    (acc, item) => acc + (item.comprado ? 0 : item.precio * item.cantidad),
    0
  );

  // Función para compartir por WhatsApp
  const compartirPorWhatsApp = () => {
    const mensaje = encodeURIComponent(
      `¡Hola! Únete a nuestra despensa compartida en la app Despensa. Ingresa con este código: *${codigoDespensa}*`
    );
    window.open(`https://api.whatsapp.com/send?text=${mensaje}`, '_blank');
  };

  const generarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(27, 67, 50);
    doc.text('Reporte de Despensa e Inventario', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Despensa Código: ${codigoDespensa}`, 14, 28);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 34);

    let valorTotal = productos.reduce((acc, p) => acc + (p.cantidad * p.precio), 0);
    
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text(`Valor Total del Inventario: $${valorTotal.toLocaleString('es-CL')}`, 14, 45);

    const tableData = productos.map(p => [
      p.nombre,
      `${p.cantidad} ${p.unidad}`,
      p.min,
      `$${p.precio.toLocaleString('es-CL')}`,
      p.cantidad <= p.min ? '⚠️ REPONER' : 'OK'
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Producto', 'Stock Actual', 'Mínimo', 'Precio Unit.', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [91, 123, 47] }
    });

    doc.save(`reporte-despensa-${codigoDespensa}.pdf`);
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-despensa-bg pb-28 pt-4 px-4 max-w-md mx-auto relative shadow-2xl rounded-3xl overflow-hidden font-sans">
      
      {/* Modal de Autenticación / Despensa */}
      {mostrarAuthModal && (
        <AuthModal 
          onLoginSuccess={(codigoAsignado) => {
            setCodigoDespensa(codigoAsignado);
            setMostrarAuthModal(false);
          }} 
        />
      )}

      {/* Modal de Cámara */}
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
          className="p-2 text-despensa-primary hover:bg-black/5 rounded-full relative"
        >
          <Menu className="w-7 h-7" />
        </button>

        {/* Menú desplegable superior */}
        {mostrarMenuDesplegable && (
          <div className="absolute top-12 left-2 bg-white rounded-2xl shadow-xl border border-despensa-primary/20 p-2 z-50 w-56 space-y-1">
            <button
              onClick={generarListaSuper}
              className="w-full text-left px-3 py-2 text-xs font-bold text-despensa-text hover:bg-despensa-bg rounded-xl flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-despensa-primary" /> Lista de Supermercado
            </button>
            <button
              onClick={() => { setActiveTab('reportes'); setMostrarMenuDesplegable(false); }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-despensa-text hover:bg-despensa-bg rounded-xl flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-despensa-primary" /> Reportes y PDF
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
          <button 
            onClick={compartirPorWhatsApp}
            className="text-[10px] text-despensa-primary font-bold flex items-center gap-1 mt-1 hover:underline"
          >
            <Share2 className="w-3 h-3" /> Compartir por WhatsApp
          </button>
        </div>
        <button className="p-2 text-despensa-primary hover:bg-black/5 rounded-full border border-despensa-primary/30">
          <User className="w-6 h-6" />
        </button>
      </header>

      {/* Buscador con Botón de Cámara (Solo visible en inicio) */}
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

      {/* Título */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-despensa-text">
          {activeTab === 'inicio' && 'Inventario en Tiempo Real'}
          {activeTab === 'agregar' && 'Nuevo Producto'}
          {activeTab === 'reportes' && 'Reportes Financieros y PDF'}
          {activeTab === 'supermercado' && 'Lista de Supermercado'}
        </h1>
      </div>

      {/* VISTA 1: INICIO */}
      {activeTab === 'inicio' && (
        <div className="space-y-3 mb-6">
          {productosFiltrados.length === 0 ? (
            <p className="text-center text-despensa-subtext text-sm py-10">No hay productos en esta despensa aún.</p>
          ) : (
            productosFiltrados.map((prod) => {
              const esCritico = prod.cantidad <= prod.min;
              return (
                <div 
                  key={prod.id} 
                  className={`rounded-2xl p-4 flex items-center justify-between shadow-sm relative border ${esCritico ? 'bg-red-50 border-red-200' : 'bg-despensa-card border-transparent'}`}
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
                    <p className="text-xs text-despensa-subtext mt-0.5">Vence: {prod.vencimiento || 'Sin fecha'}</p>
                    
                    <div className="flex items-center gap-4 pt-2">
                      <span className="text-xs font-semibold bg-white/60 px-2 py-1 rounded-lg">
                        Stock: {prod.cantidad} {prod.unidad} (Mín: {prod.min})
                      </span>
                      <span className="text-base font-extrabold text-despensa-text">
                        ${prod.precio?.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleEliminar(prod.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-full transition ml-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VISTA 2: AGREGAR PRODUCTO */}
      {activeTab === 'agregar' && (
        <form onSubmit={handleAgregarProducto} className="bg-white p-5 rounded-3xl shadow-sm space-y-3 border border-despensa-primary/20">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-despensa-text">Nombre del Producto</label>
              <button 
                type="button"
                onClick={() => { setModoEscaner('agregar'); setMostrarEscaner(true); }}
                className="text-xs text-despensa-primary font-semibold flex items-center gap-1 hover:underline"
              >
                <Camera className="w-3.5 h-3.5" /> Escanear Código
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Ej. Arroz 1kg o código" 
              value={nombre} 
              onChange={e => setNombre(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-despensa-primary outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-despensa-text">Cantidad Actual</label>
              <input 
                type="number" 
                step="any"
                placeholder="Ej. 3" 
                value={cantidad} 
                onChange={e => setCantidad(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-despensa-text">Unidad</label>
              <select 
                value={unidad} 
                onChange={e => setUnidad(e.target.value)}
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
              <label className="text-xs font-bold text-despensa-text">Stock Mínimo (Alerta)</label>
              <input 
                type="number" 
                step="any"
                placeholder="Ej. 1" 
                value={min} 
                onChange={e => setMin(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-despensa-text">Precio ($)</label>
              <input 
                type="number" 
                placeholder="Ej. 1500" 
                value={precio} 
                onChange={e => setPrecio(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-despensa-text">Fecha de Vencimiento</label>
            <input 
              type="date" 
              value={vencimiento} 
              onChange={e => setVencimiento(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm mt-1 outline-none"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-despensa-primary text-white font-bold py-3 rounded-full mt-3 shadow-md hover:opacity-90 transition text-sm"
          >
            Guardar en Despensa
          </button>
        </form>
      )}

      {/* VISTA 3: LISTA DE SUPERMERCADO */}
      {activeTab === 'supermercado' && (
        <div className="space-y-4 pb-10">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-despensa-primary/20">
            <div>
              <h2 className="text-sm font-bold text-despensa-text">Tu Compra Digital</h2>
              <p className="text-xs text-despensa-subtext">
                {listaCompras.filter(i => i.comprado).length} de {listaCompras.length} comprados
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Estimado</span>
              <span className="text-base font-extrabold text-[#d8492e]">${totalEstimado.toLocaleString('es-CL')}</span>
            </div>
          </div>

          <div className="space-y-2">
            {listaCompras.length === 0 ? (
              <p className="text-center text-despensa-subtext text-sm py-10">
                Abre el menú superior (☰) y haz clic en "Lista de Supermercado" para generarla.
              </p>
            ) : (
              listaCompras.map((item) => (
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
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA 4: REPORTES & PDF */}
      {activeTab === 'reportes' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center space-y-4 border border-despensa-primary/20">
          <FileText className="w-16 h-16 text-despensa-primary mx-auto" />
          <h2 className="font-bold text-despensa-text text-lg">Informe Financiero de Despensa</h2>
          <p className="text-xs text-despensa-subtext">
            Genera un reporte instantáneo con el valor total acumulado y la lista de productos críticos.
          </p>

          <div className="bg-despensa-bg p-4 rounded-2xl text-left space-y-1">
            <p className="text-xs font-semibold text-despensa-text">Total de productos: {productos.length}</p>
            <p className="text-xs font-semibold text-red-600">
              Productos con stock bajo: {productos.filter(p => p.cantidad <= p.min).length}
            </p>
          </div>

          <button 
            onClick={generarPDF}
            className="w-full bg-despensa-primary text-white font-bold py-3 rounded-full shadow-md hover:opacity-90 transition text-sm flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> Descargar Reporte en PDF
          </button>
        </div>
      )}

      {/* Botón Flotante para Agregar Producto rápidamente */}
      <button
        onClick={() => setActiveTab('agregar')}
        className="fixed bottom-24 right-6 bg-despensa-primary text-white p-4 rounded-full shadow-2xl hover:opacity-90 transition flex items-center justify-center z-40"
        aria-label="Agregar Producto"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Menú Inferior */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}