import React from 'react';
import { X, Bot } from 'lucide-react';

const ResizableModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        // Backdrop
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300"
        >
            {/* Modal Panel - Resizable and Responsive */}
            <div 
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl flex flex-col 
                           w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl 
                           h-3/4 max-h-[80vh] min-h-[300px] 
                           resize overflow-auto" // Resizability enabled here
            >

                {/* Content Area for Your Component */}
                <main className="flex-grow overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default ResizableModal;