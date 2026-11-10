'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LogIn, UserPlus, Home, PlusCircle } from 'lucide-react';

export default function AuthModal({ onLoginSuccess }) {
  const [session, setSession] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para onboarding de despensa
  const [modoDespensa, setModoDespensa] = useState('menu'); // 'menu', 'crear', 'unirme'
  const [nombreDespensa, setNombreDespensa] = useState('');
  const [codigoUnirse, setCodigoUnirse] = useState('');

  // 1. Manejo de Autenticación
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert('Error al registrarte: ' + error.message);
      else {
        alert('¡Cuenta creada con éxito!');
        setSession(data.session);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Error al iniciar sesión: ' + error.message);
      else {
        setSession(data.session);
        verificarDespensaUsuario(data.session.user.id);
      }
    }
    setLoading(false);
  };

  // 2. Verificar si el usuario ya tiene despensa asignada
  const verificarDespensaUsuario = async (userId) => {
    const { data } = await supabase
      .from('despensa_miembros')
      .select('despensas(codigo)')
      .eq('user_id', userId)
      .single();

    if (data?.despensas?.codigo) {
      onLoginSuccess(data.despensas.codigo);
    }
  };

  // 3. Crear Despensa Nueva
  const handleCrearDespensa = async (e) => {
    e.preventDefault();
    if (!nombreDespensa) return;
    setLoading(true);

    const nuevoCodigo = 'DESP-' + Math.floor(1000 + Math.random() * 9000);

    const { data: despensa, error: errDespensa } = await supabase
      .from('despensas')
      .insert([{ nombre: nombreDespensa, codigo: nuevoCodigo }])
      .select()
      .single();

    if (errDespensa) {
      alert('Error al crear despensa: ' + errDespensa.message);
      setLoading(false);
      return;
    }

    const { error: errMiembro } = await supabase
      .from('despensa_miembros')
      .insert([{ despensa_id: despensa.id, user_id: session.user.id }]);

    setLoading(false);
    if (!errMiembro) {
      alert(`¡Despensa creada! Tu código es: ${nuevoCodigo}`);
      onLoginSuccess(nuevoCodigo);
    }
  };

  // 4. Unirse a Despensa Existente
  const handleUnirseDespensa = async (e) => {
    e.preventDefault();
    if (!codigoUnirse) return;
    setLoading(true);

    const { data: despensa, error: errBuscar } = await supabase
      .from('despensas')
      .select('id, codigo')
      .eq('codigo', codigoUnirse.trim().toUpperCase())
      .single();

    if (errBuscar || !despensa) {
      alert('No se encontró ninguna despensa con ese código.');
      setLoading(false);
      return;
    }

    const { error: errUnir } = await supabase
      .from('despensa_miembros')
      .insert([{ despensa_id: despensa.id, user_id: session.user.id }]);

    setLoading(false);
    if (!errUnir) {
      alert('¡Te has unido con éxito a la despensa!');
      onLoginSuccess(despensa.codigo);
    } else {
      alert('Ya perteneces a esta despensa o hubo un error.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#f5e8d9] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-[#3f5228]/20 text-center">
        
        {/* PANTALLA 1: REGISTRO / LOGIN */}
        {!session ? (
          <div>
            <h2 className="text-xl font-bold text-[#3f5228] mb-1">
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h2>
            <p className="text-xs text-[#60724a] mb-5">Ingresa a tu cuenta para gestionar la despensa</p>

            <form onSubmit={handleAuth} className="space-y-3">
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#3f5228] bg-white"
                required
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#3f5228] bg-white"
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#3f5228] text-white font-bold py-3 rounded-full shadow-md hover:opacity-90 transition text-sm flex items-center justify-center gap-2"
              >
                {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Cargando...' : isRegister ? 'Registrarme' : 'Entrar'}
              </button>
            </form>

            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-[#d8492e] font-bold mt-4 hover:underline block mx-auto"
            >
              {isRegister ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        ) : (
          /* PANTALLA 2: ELEGIR / CREAR DESPENSA */
          <div>
            {modoDespensa === 'menu' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#3f5228]">¡Bienvenido!</h2>
                <p className="text-xs text-[#60724a]">Selecciona una opción para comenzar:</p>
                
                <button 
                  onClick={() => setModoDespensa('crear')}
                  className="w-full bg-[#3f5228] text-white p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> Crear una Despensa Nueva
                </button>

                <button 
                  onClick={() => setModoDespensa('unirme')}
                  className="w-full bg-white border border-[#3f5228]/40 text-[#3f5228] p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Home className="w-4 h-4" /> Unirme con Código Existente
                </button>
              </div>
            )}

            {modoDespensa === 'crear' && (
              <form onSubmit={handleCrearDespensa} className="space-y-3">
                <h3 className="font-bold text-[#3f5228]">Nombre de tu Despensa</h3>
                <input 
                  type="text" 
                  placeholder="Ej. Casa Familia Pérez" 
                  value={nombreDespensa} 
                  onChange={(e) => setNombreDespensa(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none bg-white"
                  required
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#3f5228] text-white font-bold py-3 rounded-full text-xs shadow-md"
                >
                  {loading ? 'Creando...' : 'Crear Despensa'}
                </button>
                <button type="button" onClick={() => setModoDespensa('menu')} className="text-xs text-[#60724a]">Volver</button>
              </form>
            )}

            {modoDespensa === 'unirme' && (
              <form onSubmit={handleUnirseDespensa} className="space-y-3">
                <h3 className="font-bold text-[#3f5228]">Código de la Despensa</h3>
                <input 
                  type="text" 
                  placeholder="Ej. DESP-4921" 
                  value={codigoUnirse} 
                  onChange={(e) => setCodigoUnirse(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm outline-none uppercase bg-white text-center font-bold tracking-widest"
                  required
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#d8492e] text-white font-bold py-3 rounded-full text-xs shadow-md"
                >
                  {loading ? 'Uniendo...' : 'Unirme a Despensa'}
                </button>
                <button type="button" onClick={() => setModoDespensa('menu')} className="text-xs text-[#60724a]">Volver</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}