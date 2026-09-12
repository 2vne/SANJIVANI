import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2 } from 'lucide-react';

interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
}

export const ZenAIChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init-1',
            sender: 'bot',
            text: 'Namaste! I am Zen AI. I am monitoring disaster protocols and ready to help. What do you need?',
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Fast simulated AI response
        setTimeout(() => {
            const lowerInput = userMsg.text.toLowerCase();
            let botResponse = "I've logged your request. Command Center has been notified.";

            if (lowerInput.includes('status') || lowerInput.includes('update')) {
                botResponse = "All systems operational. Currently tracking global active incidents and routing resources.";
            } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
                botResponse = "Hello! I am Zen AI, your emergency coordinator assistant. How can I assist your sector today?";
            } else if (lowerInput.includes('sos') || lowerInput.includes('help')) {
                botResponse = "🚨 High Priority SOS acknowledged. Routing immediate NDRF resources to nearby coordinates.";
            } else if (lowerInput.includes('shelter')) {
                botResponse = "We are currently monitoring live safe haven capacities. Please check the Shelters network tab for real-time occupancy.";
            }

            setMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    sender: 'bot',
                    text: botResponse,
                    timestamp: new Date()
                }
            ]);
            setIsTyping(false);
        }, 800);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col mb-4 transition-all animate-in slide-in-from-bottom-5 duration-300 transform origin-bottom-right" style={{ height: '500px' }}>

                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-900 to-slate-900 px-4 py-3 pb-4 rounded-t-2xl flex items-center justify-between border-b-4 border-emerald-500">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
                            </div>
                            <div>
                                <h3 className="text-white font-display font-black text-base flex items-center gap-1.5">
                                    Zen AI <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                                </h3>
                                <p className="text-emerald-200 text-[10px] font-mono tracking-wider font-bold">READY TO HELP</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender === 'user'
                                            ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono mt-1 px-1">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex items-start">
                                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                    <span className="text-xs text-slate-500 font-mono">Zen AI is typing...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-100">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask Zen AI for help..."
                                className="w-full bg-slate-100/70 border border-slate-200 text-slate-800 text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="absolute right-1.5 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </button>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Secured by SANJIVANI Protocol</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative group w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-emerald-400"
                >
                    <Bot className="w-6 h-6 z-10 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-slate-900"></span>
                    </span>
                    {/* Tooltip */}
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-display font-extrabold whitespace-nowrap rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700 flex items-center gap-1.5">
                        Zen AI <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-t border-r border-slate-700 transform rotate-45" />
                    </div>
                </button>
            )}
        </div>
    );
};
