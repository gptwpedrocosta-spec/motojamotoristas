import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth } from "../firebase";
import { saveDriverProfile, getDriverProfile, findDriverByEmail } from "../firebaseService";
import { Bike, Shield, User, Smartphone, Mail, Lock, Headphones, X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Driver } from "../types";

interface AuthScreenProps {
  onAuthSuccess: (driver: Driver) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [showForm, setShowForm] = useState<"login" | "signup" | null>(null);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);
  
  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [motoModel, setMotoModel] = useState("");
  const [motoColor, setMotoColor] = useState("");
  const [motoPlate, setMotoPlate] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (showForm === "login") {
        // Sign In
        let credentials;
        try {
          credentials = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          const errCode = String(signInErr?.code || "").toLowerCase();
          const errMessage = String(signInErr?.message || "").toLowerCase();
          
          if (
            errCode.includes("user-not-found") || 
            errCode.includes("invalid-credential") ||
            errCode.includes("wrong-password") ||
            errMessage.includes("user-not-found") ||
            errMessage.includes("invalid-credential") ||
            errMessage.includes("wrong-password")
          ) {
            // Check if this driver was pre-registered in any of the Firestore databases with a 3-second safety timeout
            let dbProfile = null;
            try {
              const findPromise = findDriverByEmail(email);
              const findTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
              dbProfile = await Promise.race([findPromise, findTimeout]);
            } catch (findErr) {
              console.warn("Failed to lookup driver by email:", findErr);
            }

            // Pre-registered in administrative DB or simply setting up their password for the first time
            try {
              credentials = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              const createErrCode = String(createErr?.code || "").toLowerCase();
              const createErrMessage = String(createErr?.message || "").toLowerCase();
              if (createErrCode.includes("email-already-in-use") || createErrMessage.includes("email-already-in-use")) {
                // Already exists in Auth, meaning they typed the wrong password!
                throw signInErr;
              } else {
                throw createErr;
              }
            }
          } else {
            throw signInErr;
          }
        }

        const uid = credentials.user.uid;
        
        // Save/Retrieve profile with safety timeouts
        let savedDriver = null;
        try {
          const profilePromise = getDriverProfile(uid);
          const profileTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
          savedDriver = await Promise.race([profilePromise, profileTimeout]);
        } catch (profileErr) {
          console.warn("Failed to fetch driver profile on login:", profileErr);
        }

        if (!savedDriver) {
          let dbProfile = null;
          try {
            const findPromise = findDriverByEmail(email);
            const findTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
            dbProfile = await Promise.race([findPromise, findTimeout]);
          } catch (findErr) {
            console.warn("Failed to lookup driver on fallback:", findErr);
          }

          const fallbackProfile = {
            name: dbProfile?.name || dbProfile?.nome || name || email.split("@")[0],
            email: dbProfile?.email || email,
            phone: dbProfile?.phone || dbProfile?.telefone || phone || "(11) 99999-9999",
            motoModel: dbProfile?.motoModel || dbProfile?.modeloMoto || dbProfile?.modelo || motoModel || "Honda CG 160",
            motoColor: dbProfile?.motoColor || dbProfile?.corMoto || dbProfile?.cor || motoColor || "Vermelha",
            motoPlate: dbProfile?.motoPlate || dbProfile?.placaMoto || dbProfile?.placa || motoPlate || "MOTO123"
          };

          try {
            const savePromise = saveDriverProfile(uid, fallbackProfile);
            const saveTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
            savedDriver = await Promise.race([savePromise, saveTimeout]) || { 
              uid, 
              ...fallbackProfile, 
              online: false, 
              status: 'idle' as const, 
              rating: 4.9, 
              totalRides: 0, 
              earnings: 0, 
              currentRideId: null, 
              updatedAt: new Date() as any 
            };
          } catch (saveErr) {
            console.warn("Failed to save driver profile on login:", saveErr);
            savedDriver = { 
              uid, 
              ...fallbackProfile, 
              online: false, 
              status: 'idle' as const, 
              rating: 4.9, 
              totalRides: 0, 
              earnings: 0, 
              currentRideId: null, 
              updatedAt: new Date() as any 
            };
          }
        }

        if (savedDriver) {
          onAuthSuccess(savedDriver);
        }
      } else {
        // Sign Up
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const uid = credentials.user.uid;

        const newDriver = await saveDriverProfile(uid, {
          name,
          email,
          phone,
          motoModel,
          motoColor,
          motoPlate,
        });

        if (newDriver) {
          onAuthSuccess(newDriver);
        }
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = "Ocorreu um erro ao autenticar. Verifique seus dados e tente novamente.";
      const errCode = String(err?.code || "").toLowerCase();
      const errMessage = String(err?.message || "").toLowerCase();

      if (
        errCode.includes("invalid-credential") || 
        errCode.includes("wrong-password") || 
        errCode.includes("user-not-found") ||
        errMessage.includes("invalid-credential") ||
        errMessage.includes("wrong-password") ||
        errMessage.includes("user-not-found")
      ) {
        errMsg = "E-mail ou senha inválidos. Tente novamente.";
      } else if (errCode.includes("email-already-in-use") || errMessage.includes("email-already-in-use")) {
        errMsg = "Este e-mail já está cadastrado.";
      } else if (errCode.includes("weak-password") || errMessage.includes("weak-password")) {
        errMsg = "A senha deve ter pelo menos 6 caracteres.";
      } else if (errCode.includes("invalid-email") || errMessage.includes("invalid-email")) {
        errMsg = "O e-mail digitado possui formato inválido.";
      } else if (errCode.includes("admin-restricted-operation") || errMessage.includes("admin-restricted-operation")) {
        errMsg = "O cadastro de novos usuários está temporariamente desativado. Use o modo demonstração ou entre em contato.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return (
      <div id="auth-splash-screen" className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0">
          <img 
            src="/src/assets/images/motoja_bg_1783533165172.jpg" 
            alt="Moto Rider Background" 
            className="w-full h-full object-cover object-center opacity-25 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-zinc-950/50 z-10" />
        </div>
        <div className="z-20 text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-20 h-20 bg-yellow-400 text-zinc-950 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-400/40 transform -rotate-3">
              <Bike className="w-12 h-12 stroke-[2.5]" />
            </div>
            <h1 className="text-5xl font-black italic tracking-tighter text-white">
              Moto<span className="text-yellow-400">Já</span>
            </h1>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
              Motorista Profissional
            </p>
          </motion.div>
          <div className="flex flex-col items-center gap-2 pt-10">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="auth-screen-root" className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between items-center relative overflow-hidden font-sans">
      
      {/* Background Image with Dark Vignette */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/src/assets/images/motoja_bg_1783533165172.jpg" 
          alt="Moto Rider Background" 
          className="w-full h-full object-cover object-center opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40 z-10" />
        <div className="absolute inset-0 bg-black/40 z-5" />
      </div>

      {/* Header Info - Status bar spacer */}
      <div className="w-full max-w-md px-6 pt-12 z-20 flex justify-between items-center text-[11px] font-mono font-bold text-zinc-400 select-none">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="w-4 h-2.5 bg-zinc-400/20 rounded-sm relative overflow-hidden">
            <span className="absolute top-0 bottom-0 left-0 right-1 bg-zinc-100" />
          </span>
        </div>
      </div>

      {/* Main Branding Section */}
      <div className="w-full max-w-md px-8 flex-1 flex flex-col justify-center items-center text-center z-20">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          {/* Logo with bike */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 bg-yellow-400 text-zinc-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-400/20 transform -rotate-3">
              <Bike className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white font-sans flex items-center">
              Moto<span className="text-yellow-400">Já</span>
            </h1>
          </div>
          
          <p className="text-sm text-zinc-300 font-medium tracking-wide">
            Vá mais longe. Ganhe mais.
          </p>
        </motion.div>
      </div>

      {/* Bottom Actions Section (matches Screen 1) */}
      <div className="w-full max-w-md px-6 pb-12 z-20 space-y-6">
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div
              key="auth-buttons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3.5"
            >
              {/* Entrar Button */}
              <button
                id="btn-entrar"
                onClick={() => setShowForm("login")}
                className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-sans font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center"
              >
                Entrar
              </button>

              {/* Criar Conta Button */}
              <button
                id="btn-criar-conta"
                onClick={() => setShowForm("signup")}
                className="w-full py-4 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 text-white font-sans font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center"
              >
                Criar conta
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 25 }}
              className="bg-zinc-900/95 border border-zinc-800 p-6 rounded-3xl shadow-2xl backdrop-blur-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setShowForm(null); setError(null); }}
                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest">
                  {showForm === "login" ? "Entrar na sua conta" : "Cadastrar novo motorista"}
                </h3>
                <div className="w-5 h-5" /> {/* spacer */}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-medium leading-snug">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Sign up details */}
                {showForm === "signup" && (
                  <div className="space-y-3 pt-2 border-t border-zinc-800/50 max-h-[180px] overflow-y-auto pr-1">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          required
                          placeholder="José da Silva"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">WhatsApp / Celular</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="tel"
                          required
                          placeholder="(11) 99999-8888"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    {/* Moto specs */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Modelo da Moto</label>
                        <input
                          type="text"
                          required
                          placeholder="Honda CG 160"
                          value={motoModel}
                          onChange={(e) => setMotoModel(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cor da Moto</label>
                        <input
                          type="text"
                          required
                          placeholder="Vermelha"
                          value={motoColor}
                          onChange={(e) => setMotoColor(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    {/* Placa */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Placa Mercosul</label>
                      <input
                        type="text"
                        required
                        placeholder="ABC1D23"
                        value={motoPlate}
                        onChange={(e) => setMotoPlate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                )}

                {/* Submit action button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-sans font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>{showForm === "login" ? "Entrar" : "Criar conta"}</span>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Support link at the very bottom (matches Screen 1) */}
        <div className="flex justify-center items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer transition-colors select-none">
          <Headphones className="w-4 h-4 text-yellow-400" />
          <span>Suporte 24h</span>
        </div>
      </div>
    </div>
  );
}
