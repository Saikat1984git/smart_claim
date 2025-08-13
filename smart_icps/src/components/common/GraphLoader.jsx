import React, { useState, useEffect } from 'react';


const GraphLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="flex items-end justify-center space-x-2 h-16">
        {/* These divs represent the animated bars of the loader */}
        <div className="w-4 bg-blue-500 animate-bar-grow" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 bg-blue-500 animate-bar-grow" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-4 bg-blue-500 animate-bar-grow" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 bg-blue-500 animate-bar-grow" style={{ animationDelay: '0.3s' }}></div>
        <div className="w-4 bg-blue-500 animate-bar-grow" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <p className="mt-4 text-lg font-medium text-gray-700">
        Processing Data...
      </p>
      <p className="text-gray-500">Generating graph, please wait.</p>

      {/* CSS for the animation is injected here */}
      <style>{`
        @keyframes bar-grow {
          0%, 100% {
            height: 0.5rem;
            background-color: #3b82f6; /* blue-500 */
          }
          50% {
            height: 4rem; /* 64px */
            background-color: #60a5fa; /* blue-400 */
          }
        }
        .animate-bar-grow {
          animation: bar-grow 1.2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default GraphLoader;