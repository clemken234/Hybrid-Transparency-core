import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import IssuePage from './IssuePage';
import RegistryPage from './RegistryPage';

export default function App() {
  // Theme State
  const [isDark, setIsDark] = useState(true); // Default to Dark Mode because it looks cooler!

  // This hook physically adds or removes the "dark" class to the entire website
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <BrowserRouter>
      {/* The Main Wrapper: Changes from light gray to Alchemy Midnight Blue */}
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0E14] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
        
        {/* Top Navigation Bar */}
        <nav className="bg-white dark:bg-[#151A22] shadow dark:shadow-none border-b border-gray-200 dark:border-gray-800 p-4 mb-8 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 dark:bg-blue-500 text-white p-2 rounded shadow-sm">🛡️</div>
            <h1 className="text-xl font-bold tracking-wide">LTO Admin Portal</h1>
          </div>
          
          <div className="space-x-1 flex items-center">
            <Link to="/" className="px-4 py-2 rounded-md font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors">
              Issuance
            </Link>
            <Link to="/registry" className="px-4 py-2 rounded-md font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors">
              Registry & Revocation
            </Link>
            
            {/* Dark Mode Toggle Button */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="ml-4 p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-yellow-300 hover:ring-2 ring-gray-300 dark:ring-gray-600 transition-all"
              title="Toggle Theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <Routes>
          <Route path="/" element={<IssuePage />} />
          <Route path="/registry" element={<RegistryPage />} />
        </Routes>
        
      </div>
    </BrowserRouter>
  );
}