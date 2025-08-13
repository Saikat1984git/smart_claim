import React, { useState } from 'react';
import { Link } from 'react-router-dom'; 
import { 
    LayoutDashboard, 
    FileText, 
    BarChart, 
    LogOut, 
    Bell, 
    Sparkles,
    Columns3 
} from 'lucide-react';
import ChatSection from '../dashboard/ChatSection';
import ResizableModal from '../dashboard/ResizableModal';

export default function Navbar() {
    const [activeLink, setActiveLink] = useState('HOME');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const navLinks = [
        { name: 'HOME', icon: LayoutDashboard, href: '/' },
        { name: 'CLAIM', icon: FileText, href: '/claim' },
        { name: 'REPORTS', icon: BarChart, href: '/reports' },
        { name: 'SMART TABLE', icon: Columns3 , href: '/smarttable' }
    ];

    return (
        <>
            <header className="shadow-md">
                {/* Top bar */}
                <div className="bg-[#2d2d2d] text-white">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-4">
                                <img 
                                    src="https://www.mazdausa.com/siteassets/images/home/4218-update/mazda-usa-logo" 
                                    width="50px" 
                                    height="50px" 
                                    alt="Mazda Logo"
                                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/150x40/252525/FFFFFF?text=Logo'; }}
                                />
                                <h1 className="text-lg font-semibold tracking-wider text-gray-300 hidden sm:block">
                                    Intelligent Claim Management System (iCMS)
                                </h1>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-right text-xs">
                                    <p>Dealer: D1180</p>
                                    <p>User: John Doe</p>
                                </div>
                                <button className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
                                    <Bell className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={handleOpenModal}
                                    className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                                >
                                    <Sparkles className="h-5 w-5" />
                                    <span>Ask AI</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar with primary navigation */}
                <nav className="bg-white border-b border-gray-200">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14">
                            <div className="flex items-center space-x-6">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        to={link.href}
                                        onClick={() => setActiveLink(link.name)}
                                        className={`flex items-center space-x-2 text-sm font-medium transition-all duration-300 relative ${
                                            activeLink === link.name
                                                ? 'text-blue-600'
                                                : 'text-gray-600 hover:text-blue-500'
                                        }`}
                                    >
                                        <link.icon className="h-4 w-4" />
                                        <span className="hidden md:inline">{link.name}</span>
                                        {activeLink === link.name && (
                                            <span className="absolute -bottom-4 left-0 w-full h-0.5 bg-blue-600 rounded-full"></span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                            <div>
                                <button
                                    className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors duration-200"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className="hidden md:inline">LOGOUT</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>
            </header>
            
            {/* ✨ YOUR CUSTOM COMPONENT GOES HERE ✨ */}
            <ResizableModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal}
                title="Ask iCMS AI Assistant"
            >
               <ChatSection/>
            </ResizableModal>
        </>
    );
}