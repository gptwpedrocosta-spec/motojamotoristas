import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, Ride } from "../types";
import { subscribeToChatMessages, sendChatMessage } from "../firebaseService";

interface ChatModalProps {
  ride: Ride;
  onClose: () => void;
}

const QUICK_REPLIES = [
  "Estou a caminho!",
  "Cheguei no local de embarque!",
  "Estou com capacete vermelho.",
  "Pode me aguardar na calçada?",
  "Tranquilo, te espero!"
];

const PASSENGER_RESPONSES = [
  "Beleza, estou descendo!",
  "Ok, estou vestindo blusa preta.",
  "Certo! Estou te esperando.",
  "Estou na frente do portão cinza.",
  "Sem problemas!"
];

export default function ChatModal({ ride, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to chat messages
    const unsubscribe = subscribeToChatMessages(ride.id, (loadedMessages) => {
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [ride.id]);

  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setInputText("");
    
    try {
      await sendChatMessage(ride.id, "driver", text);
      
      // Simulate passenger typing and responding 2 seconds later
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        const randomResp = PASSENGER_RESPONSES[Math.floor(Math.random() * PASSENGER_RESPONSES.length)];
        await sendChatMessage(ride.id, "passenger", randomResp);
      }, 2500);

    } catch (e) {
      console.error("Erro ao enviar mensagem: ", e);
    }
  };

  return (
    <motion.div
      id="chat-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        id="chat-modal-content"
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-[500px] shadow-2xl overflow-hidden"
      >
        {/* Chat Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                Chat com o Passageiro
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Passageiro: {ride.passengerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center p-6">
              <MessageCircle className="w-12 h-12 text-zinc-700 mb-2 animate-bounce" style={{ animationDuration: "3s" }} />
              <p className="text-sm font-medium">Nenhuma mensagem ainda.</p>
              <p className="text-xs mt-1">Mande um oi! Use as respostas rápidas abaixo para mandar com facilidade.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isDriver = msg.sender === "driver";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isDriver ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-md ${
                      isDriver
                        ? "bg-yellow-500 text-zinc-950 rounded-tr-none"
                        : "bg-zinc-800 text-white rounded-tl-none"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}

          {/* Simulated Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-1">
                <span>Passageiro está digitando</span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies Tray */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800">
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1 select-none">
            <Sparkles className="w-2.5 h-2.5 text-yellow-500" /> Respostas Rápidas (Toque único)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
            {QUICK_REPLIES.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(reply)}
                className="whitespace-nowrap px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/50 hover:border-yellow-500/50 rounded-full text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all font-medium shrink-0 active:scale-95"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
          />
          <button
            type="submit"
            className="p-2.5 bg-yellow-500 text-zinc-950 rounded-xl hover:bg-yellow-400 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
