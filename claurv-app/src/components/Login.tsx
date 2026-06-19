import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
  onGuest: () => void;
}

export default function Login({ onSuccess, onGuest }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(email, password);
    if (success) {
      onSuccess();
    } else {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center text-amber-700 shadow-md">
          <Compass className="h-9 w-9 animate-spin-slow" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-800 tracking-tight">
          CLAUVR 360°
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Plataforma de Tours Virtuales Inmersivos
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-amber-900/5 rounded-3xl border border-amber-900/5 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="cpulache@clubregatas.org.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-800 text-sm transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-[#FAF6F0]/40 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-800 text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-amber-600/10 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all hover:scale-[1.01]"
              >
                Iniciar Sesión (Administrador)
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative flex justify-center text-xs uppercase tracking-wider font-bold">
              <span className="bg-white px-3 text-slate-400">O ingresa como</span>
            </div>

            <div className="mt-4">
              <button
                onClick={onGuest}
                className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition"
              >
                Modo Invitado (Solo visualización)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
