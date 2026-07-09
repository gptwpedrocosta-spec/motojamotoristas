import React, { useState, useEffect } from "react";
import { ArrowUpRight, CheckCircle2, RefreshCw, MapPin, Calendar, Clock, Landmark, History, Coins } from "lucide-react";
import { Driver, Ride } from "../types";
import { playSuccessSound } from "../utils/audio";
import { motion, AnimatePresence } from "motion/react";
import { loadDriverRideHistory, updateWalletBalance } from "../firebaseService";

interface EarningsViewProps {
  driver: Driver;
  walletBalance: number;
}

interface EarningItem {
  time: string;
  address: string;
  price: string;
}

export default function EarningsView({ driver, walletBalance }: EarningsViewProps) {
  // Dual-mode layout selection: "resumo" (financial screen) or "historico" (dedicated ride history screen)
  const [viewMode, setViewMode] = useState<"resumo" | "historico">("resumo");
  const [activeTab, setActiveTab] = useState<"diario" | "semanal" | "mensal">("diario");
  const [withdrawing, setWithdrawing] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [withdrawnAmount, setWithdrawnAmount] = useState<number>(0);
  const [realHistory, setRealHistory] = useState<Ride[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sync available balance based on real walletBalance changes
  const [availableBalance, setAvailableBalance] = useState(walletBalance);

  useEffect(() => {
    setAvailableBalance(walletBalance);
  }, [walletBalance]);

  // Load real history from Firestore
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const history = await loadDriverRideHistory(driver.uid);
        setRealHistory(history);
      } catch (err) {
        console.error("Error loading ride history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [driver.uid, walletBalance]);

  const getEarningItems = (): EarningItem[] => {
    // Map the actual completed history
    const completedRides = realHistory.filter(
      (r) => r.status === "completed" || r.status === "finished" || r.status === "finalizada"
    );

    return completedRides.map((ride) => {
      let timeStr = "Corrida";
      if (ride.createdAt) {
        const dateObj = (ride.createdAt as any).toDate 
          ? (ride.createdAt as any).toDate() 
          : new Date(ride.createdAt);
        timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return {
        time: timeStr,
        address: ride.dropoffAddress || "Corrida Concluída",
        price: `R$ ${ride.price.toFixed(2)}`
      };
    });
  };

  const getTotalAmountText = () => {
    // Sum the total amount of completed/finished/finalizada rides
    const total = realHistory
      .filter((r) => r.status === "completed" || r.status === "finished" || r.status === "finalizada")
      .reduce((sum, r) => sum + (r.price || 0), 0);
    return `R$ ${total.toFixed(2)}`;
  };

  const getSubText = () => {
    return "Total Acumulado";
  };

  const getCorridasText = () => {
    const count = realHistory.filter(
      (r) => r.status === "completed" || r.status === "finished" || r.status === "finalizada"
    ).length;
    return `${count} ${count === 1 ? "corrida" : "corridas"}`;
  };

  const handleWithdraw = async () => {
    if (availableBalance <= 0) return;
    setWithdrawing(true);
    
    try {
      // Subtract from real balance in Firestore
      await updateWalletBalance(driver.uid, -availableBalance);
      setWithdrawnAmount(availableBalance);
      setAvailableBalance(0);
      setIsSuccessModalOpen(true);
      playSuccessSound();
    } catch (err) {
      console.error("Error processing withdrawal:", err);
    } finally {
      setWithdrawing(false);
    }
  };

  // Helper to format date nicely
  const formatDate = (dateInput: any) => {
    if (!dateInput) return "Data desconhecida";
    const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // Helper to format time nicely
  const formatTime = (dateInput: any) => {
    if (!dateInput) return "";
    const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get finalized rides for history list
  const getHistoryRides = (): any[] => {
    return realHistory.filter(
      (r) => r.status === "completed" || r.status === "finished" || r.status === "finalizada"
    );
  };

  return (
    <div id="earnings-view-root" className="space-y-5">
      
      {/* Upper Dual Mode Switcher Tab (Aesthetic Segmented Control) */}
      <div className="flex bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl shadow-inner">
        <button
          onClick={() => setViewMode("resumo")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-sans font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "resumo"
              ? "bg-yellow-400 text-zinc-950 font-black shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Coins className="w-4 h-4" />
          Resumo Financeiro
        </button>
        <button
          onClick={() => setViewMode("historico")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-sans font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "historico"
              ? "bg-yellow-400 text-zinc-950 font-black shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          Histórico Corridas
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "resumo" ? (
          <motion.div
            key="resumo-panel"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Title */}
            <div className="space-y-0.5">
              <h2 className="text-lg font-black uppercase tracking-tight text-white">
                Minha Carteira
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-semibold">Resumo de Ganhos</p>
            </div>

            {/* Tab Selectors (matches Screen 6 exactly) */}
            <div className="grid grid-cols-3 bg-zinc-900/60 p-1 rounded-2xl border border-zinc-850">
              <button
                onClick={() => setActiveTab("diario")}
                className={`py-2.5 text-[10px] font-sans font-bold uppercase tracking-wider rounded-xl transition-all ${
                  activeTab === "diario" 
                    ? "bg-zinc-800 text-yellow-400 font-black shadow border border-zinc-700" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Diário
              </button>
              <button
                onClick={() => setActiveTab("semanal")}
                className={`py-2.5 text-[10px] font-sans font-bold uppercase tracking-wider rounded-xl transition-all ${
                  activeTab === "semanal" 
                    ? "bg-zinc-800 text-yellow-400 font-black shadow border border-zinc-700" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setActiveTab("mensal")}
                className={`py-2.5 text-[10px] font-sans font-bold uppercase tracking-wider rounded-xl transition-all ${
                  activeTab === "mensal" 
                    ? "bg-zinc-800 text-yellow-400 font-black shadow border border-zinc-700" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Mensal
              </button>
            </div>

            {/* Main Earning Display */}
            <div className="text-center py-4 space-y-1.5 select-none relative bg-zinc-900/30 border border-zinc-850/60 rounded-3xl p-5 shadow-sm">
              <h3 className="text-4xl font-black text-white tracking-tight font-sans">
                {getTotalAmountText()}
              </h3>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold">
                {getSubText()}
              </p>
              <p className="text-[11px] text-emerald-400 font-sans font-extrabold mt-1">
                {getCorridasText()}
              </p>
            </div>

            {/* Available Balance Box with Draw Option (matches Screen 6) */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-4.5 rounded-3xl flex items-center justify-between shadow-xl">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-bold flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-yellow-400" />
                  Saldo para saque (Pix)
                </p>
                <p className="text-xl font-black text-white font-sans">
                  R$ {availableBalance.toFixed(2)}
                </p>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={availableBalance <= 0 || withdrawing}
                className="px-4.5 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-md font-sans border border-yellow-500/20"
              >
                {withdrawing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Sacar</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Summary Earnings List */}
            <div className="space-y-2">
              <h4 className="text-[10px] text-zinc-500 font-sans font-bold uppercase tracking-wider pl-2">
                Resumo Recente de Atividades
              </h4>
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl overflow-hidden divide-y divide-zinc-850/60 shadow-sm">
                {loadingHistory ? (
                  <div className="p-8 text-center text-xs text-zinc-500 font-medium flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-yellow-400" />
                    Carregando histórico do servidor...
                  </div>
                ) : getEarningItems().length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500 font-medium">
                    Nenhuma corrida realizada ainda.
                  </div>
                ) : (
                  getEarningItems().slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg">
                          {item.time}
                        </span>
                        <p className="text-xs text-zinc-200 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                          {item.address}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-400 font-extrabold">
                        + {item.price}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="historico-panel"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            {/* Title */}
            <div className="space-y-0.5">
              <h2 className="text-lg font-black uppercase tracking-tight text-white">
                Histórico de Corridas
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-semibold">Todas as viagens concluídas</p>
            </div>

            {/* Ride History Detailed List Container */}
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-10 text-center text-xs text-zinc-500 font-medium flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-yellow-400" />
                  Carregando corridas finalizadas do servidor...
                </div>
              ) : getHistoryRides().length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-10 text-center text-xs text-zinc-500 font-medium">
                  Nenhum registro de corrida finalizada encontrado.
                </div>
              ) : (
                getHistoryRides().map((ride) => (
                  <div
                    key={ride.id}
                    className="bg-zinc-900/80 border border-zinc-850 p-4 rounded-2xl space-y-3.5 shadow-md hover:border-zinc-800 transition-all"
                  >
                    {/* Header: Date and Price */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs font-sans font-bold text-zinc-300">
                          {formatDate(ride.createdAt)}
                        </span>
                        {ride.createdAt && (
                          <>
                            <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] font-mono text-zinc-400">
                              {formatTime(ride.createdAt)}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-400">
                        + R$ {ride.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Timeline Addresses */}
                    <div className="space-y-3">
                      {/* Pickup Address */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider font-bold">Origem</p>
                          <p className="text-xs text-zinc-200 font-medium">
                            {ride.pickupAddress || "Não informado"}
                          </p>
                        </div>
                      </div>

                      {/* Line connector */}
                      <div className="w-0.5 h-3.5 bg-zinc-800 ml-1.25" />

                      {/* Dropoff Address */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider font-bold">Destino</p>
                          <p className="text-xs text-zinc-200 font-medium">
                            {ride.dropoffAddress || "Não informado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success withdrawal modal */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center shadow-2xl space-y-4 animate-none"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-sans">
                  Pix Enviado com Sucesso!
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  O valor de <strong className="text-white">R$ {withdrawnAmount.toFixed(2)}</strong> foi transferido instantaneamente via Pix para a sua conta bancária sob chaves cadastradas.
                </p>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Chave Pix:</span>
                <span className="text-zinc-300 font-bold">CPF Cadastrado</span>
              </div>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-3 bg-yellow-400 text-zinc-950 rounded-xl font-bold uppercase tracking-wider text-xs active:scale-[0.98] transition-all cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
