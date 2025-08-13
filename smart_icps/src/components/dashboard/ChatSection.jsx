import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown  from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, CornerDownLeft, Loader } from 'lucide-react';

// Main Chat Component
const ChatSection = ({ height = '500px' }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm your AI assistant. Ask me anything, and I'll do my best to help you. You can ask for summaries, explanations, or even code snippets.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef(null);

  const getAIResponse = async (userInput) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/ai-chatbot-sql/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: userInput })
      });
  
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
  
      const data = await response.json();
      
      // Assuming the API returns { message: "some response" }
      return data.content || "I couldn't understand the response.";
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "Sorry, there was an error contacting the AI server.";
    }
  };
  

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponseContent = await getAIResponse(input);
      const aiMessage = { id: Date.now() + 1, role: 'assistant', content: aiResponseContent };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
        console.error("API Error:", error);
        const errorMessage = { id: Date.now() + 1, role: 'assistant', content: "Sorry, something went wrong. Please try again." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-white text-gray-800 flex flex-col w-full max-w-[100%] h-full mx-auto rounded-xl shadow-lg border border-gray-2004">
      <div className="p-4 border-b border-gray-200 flex items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="text-blue-600"/>
            AI Assistant
        </h2>
      </div>

      <div ref={scrollAreaRef} className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50">
        <AnimatePresence>
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          {isLoading && <LoadingIndicator />}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="w-full bg-gray-100 border border-gray-300 rounded-lg py-3 pr-20 pl-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-gray-900"
            rows="1"
            style={{ minHeight: '50px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors duration-300"
          >
            {isLoading ? <Loader className="animate-spin" size={20}/> : <Send size={20} />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          Press <CornerDownLeft size={12}/> to send. Shift + <CornerDownLeft size={12}/> for a new line.
        </p>
      </div>
    </div>
  );
};

// Message Component with animation
const Message = ({ message }) => {
  const isAI = message.role === 'assistant';

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex items-start gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
    >
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <Bot className="text-blue-600" size={20}/>
        </div>
      )}
      
      <div className={`max-w-xl p-4 rounded-xl shadow-sm ${isAI ? 'bg-white' : 'bg-blue-600 text-white'}`}>
          <div className={`prose prose-sm max-w-none ${isAI ? 'text-gray-800' : 'prose-invert'}`}>
              <Markdown  remarkPlugins={[remarkGfm]}>
                  {message.content}
              </Markdown >
          </div>
      </div>

      {!isAI && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <User className="text-white" size={20}/>
        </div>
      )}
    </motion.div>
  );
};

// Loading Indicator Component
const LoadingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 justify-start"
    >
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <Bot className="text-blue-600" size={20}/>
        </div>
        <div className="bg-white p-4 rounded-xl flex items-center space-x-2 shadow-sm">
            <motion.div className="w-2 h-2 bg-blue-500 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}/>
            <motion.div className="w-2 h-2 bg-blue-500 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}/>
            <motion.div className="w-2 h-2 bg-blue-500 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}/>
        </div>
    </motion.div>
  );
};

export default ChatSection;
