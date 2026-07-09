import React, { useState } from "react";
import { User, Smartphone, Bike, Palette, CreditCard, Save, LogOut, CheckCircle2 } from "lucide-react";
import { Driver } from "../types";
import { saveDriverProfile } from "../firebaseService";
import { auth } from "../firebase";

interface ProfileViewProps {
  driver: Driver;
  onUpdate: (updatedDriver: Driver) => void;
  onSignOut: () => void;
}

export default function ProfileView({ driver, onUpdate, onSignOut }: ProfileViewProps) {
  const [name, setName] = useState(driver.name);
  const [phone, setPhone] = useState(driver.phone);
  const [motoModel, setMotoModel] = useState(driver.motoModel);
  const [motoColor, setMotoColor] = useState(driver.motoColor);
  const [motoPlate, setMotoPlate] = useState(driver.motoPlate);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const updatedProfile = await saveDriverProfile(driver.uid, {
        name,
        email: driver.email,
        phone,
        motoModel,
        motoColor,
        motoPlate,
      });

      if (updatedProfile) {
        onUpdate(updatedProfile);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Driver Info Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-800">
        <div className="w-14 h-14 bg-yellow-500 rounded-2xl flex items-center justify-center text-zinc-950 font-display font-extrabold text-xl shadow-md">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">{name || "Motorista"}</h3>
          <p className="text-xs text-zinc-400 font-medium">{driver.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              ★ {driver.rating.toFixed(1)} Classificação
            </span>
            <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {driver.totalRides} Corridas
            </span>
          </div>
        </div>
      </div>

      {/* Driver Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Details Section */}
        <div>
          <h4 className="text-[10px] text-zinc-500 font-display font-bold uppercase tracking-wider mb-2.5">
            Informações Pessoais
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* Phone Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">Telefone / WhatsApp</label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Details Section */}
        <div>
          <h4 className="text-[10px] text-zinc-500 font-display font-bold uppercase tracking-wider mb-2.5">
            Dados da Motocicleta
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {/* Moto Model */}
            <div className="space-y-1">
              <label className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">Modelo</label>
              <div className="relative">
                <Bike className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Honda CG 160"
                  value={motoModel}
                  onChange={(e) => setMotoModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8.5 pr-3 py-2.5 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* Moto Color */}
            <div className="space-y-1">
              <label className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">Cor</label>
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Vermelha"
                  value={motoColor}
                  onChange={(e) => setMotoColor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8.5 pr-3 py-2.5 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* Moto Plate */}
            <div className="space-y-1">
              <label className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">Placa</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="ABC1D23"
                  value={motoPlate}
                  onChange={(e) => setMotoPlate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8.5 pr-3 py-2.5 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 text-xs font-display font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" /> Sair da Conta
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 text-xs font-display font-bold bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 active:scale-95 cursor-pointer ml-auto"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Dados
          </button>
        </div>
      </form>

      {/* Success Notification */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-xs font-medium justify-center">
          <CheckCircle2 className="w-4 h-4" /> Perfil atualizado com sucesso!
        </div>
      )}
    </div>
  );
}
