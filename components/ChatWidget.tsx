import React, { useState, useRef, useEffect } from 'react';
import { chatWithBot, transcribeAudio } from '../services/geminiService';
import { ChatMessage } from '../types';
import { fileToBase64 } from '../utils';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithBot(history, userMsg.text, useSearch, useThinking);
      
      const botMsg: ChatMessage = { role: 'model', text: responseText || "I couldn't generate a response.", timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = { role: 'model', text: "Sorry, something went wrong.", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsLoading(true);
          try {
              const base64 = await fileToBase64(file);
              const transcription = await transcribeAudio(base64, file.type);
              setInputValue(transcription || "");
          } catch (err) {
              console.error(err);
              alert("Failed to transcribe audio");
          } finally {
              setIsLoading(false);
          }
      }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg z-50 transition-all duration-300 ${isOpen ? 'bg-red-500 rotate-45' : 'bg-indigo-600 hover:bg-indigo-500'}`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 w-96 max-w-[90vw] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-40 flex flex-col transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ height: '500px' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gray-800/50 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-semibold text-white">VibefIT Assistant</h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-400" title="Use Google Search Grounding">
               <input type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} />
               Search
            </label>
             <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-400" title="Enable Thinking Mode (Gemini 3 Pro)">
               <input type="checkbox" checked={useThinking} onChange={(e) => setUseThinking(e.target.checked)} />
               Think
            </label>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-10">
              Ask me anything about fashion, trends, or style!
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-200 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-400 p-3 rounded-2xl rounded-bl-none text-xs animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-800 flex items-center gap-2">
           <label className="p-2 text-gray-400 hover:text-white cursor-pointer transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <input type="file" accept="audio/*" className="hidden" onChange={handleAudioInput} />
           </label>
          <input
            type="text"
            className="flex-1 bg-gray-950 border border-gray-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatWidget;