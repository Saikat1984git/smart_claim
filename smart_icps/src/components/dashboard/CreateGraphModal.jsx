import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { motion, AnimatePresence } from 'framer-motion';
import config from '../../config';


// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Helper function to parse the complex response string
const parseWidgetData = (widgetData) => {
    if (widgetData.type !== 'chart') return null;
    try {
        const content = JSON.parse(widgetData.content);
        // new Function() is a safer way to parse the stringified JS object config
        const chartConfig = new Function(`return ${content.config}`)();

        // Generate table data from the chart config
        const tableData = {
            headers: ['Model', chartConfig.data.datasets[0].label || 'Value'],
            rows: chartConfig.data.labels.map((label, index) => [
                label,
                chartConfig.data.datasets[0].data[index]
            ])
        };

        return {
            id: widgetData.id,
            title: content.title,
            config: chartConfig,
            tableData: tableData,
        };
    } catch (e) {
        console.error("Error parsing widget data:", e);
        return null;
    }
};


const CreateGraphModal = ({ isOpen, onClose, widgets, setWidgets, layout, setLayout }) => {
    const [prompt, setPrompt] = useState('');
    const [widgetPreview, setWidgetPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState('prompt'); // 'prompt', 'preview'

    // Reset state when modal is closed or reopened
    useEffect(() => {
        if (isOpen) {
            setStep('prompt');
            setWidgetPreview(null);
            setPrompt('');
        }
    }, [isOpen]);

    // // Simulates calling an AI API to get chart data
    // const handleGenerateWidget = () => {
    //     if (!prompt.trim()) return; // Don't generate if prompt is empty
    //     setIsLoading(true);
    //     setWidgetPreview(null);

    //     // A more detailed dummy response for a richer preview
    //     const dummyResponse = {
    //         id: `widget-${Date.now()}`,
    //         type: 'chart',
    //         content: `{"title": "Analysis of '${prompt}'", "config": "{ type: 'bar', data: { labels: ['MAZDA3_SEDAN','MAZDA_CX_5','MAZDA_CX_50','MAZDA_CX_90','MAZDA_MX_5_MIATA'], datasets: [{ label: 'Claim Count', data: [${Array.from({length: 5}, () => Math.floor(Math.random() * 500) + 700)}], backgroundColor: ['#a7f3d0', '#bae6fd', '#fef08a', '#fecaca', '#e9d5ff'], borderColor: ['#059669', '#0284c7', '#ca8a04', '#dc2626', '#8b5cf6'], borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(200, 200, 200, 0.2)' } }, x: { grid: { display: false } } } } }"}`
    //     };

    //     // Simulate API latency
    //     setTimeout(() => {
    //         const parsedWidget = parseWidgetData(dummyResponse);
    //         setWidgetPreview(parsedWidget);
    //         setIsLoading(false);
    //         setStep('preview');
    //     }, 1500);
    // };

// Simulates calling an AI API to get chart data
const handleGenerateWidget = () => {
    if (!prompt.trim()) return; // Don't generate if prompt is empty
    setIsLoading(true);
    setWidgetPreview(null);

    // This is the actual API call to your Python backend
    fetch(`${config.API_BASE_URL}/ai-data-provider/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        // Assuming your PromptInput Pydantic model expects a field named "prompt_text"
        body: JSON.stringify({ "prompt": prompt }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(apiResponse => {
        // *** CHANGE IS HERE ***
        // Add the client-side widget ID to the object received from the API
        const responseWithId = {
            id: `widget-${Date.now()}`,
            ...apiResponse // Copies 'type' and 'content' from the apiResponse
        };

        // Now, pass the complete object to be parsed
        const parsedWidget = parseWidgetData(responseWithId);
        setWidgetPreview(parsedWidget);
        setStep('preview');
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
        // Optionally, you could set an error state here to show a message to the user
    })
    .finally(() => {
        setIsLoading(false);
    });
};
    // Adds the accepted widget to the main dashboard
    const handleAcceptWidget = () => {
        if (!widgetPreview) return;

        const newLayoutItem = {
            i: widgetPreview.id,
            x: (layout.length * 6) % 12, // Basic logic to avoid overlap
            y: Infinity, // Stacks the new widget at the bottom
            w: 6,
            h: 5, // Slightly taller to accommodate content
            minW: 4,
            minH: 4,
        };

        setWidgets([...widgets, widgetPreview]);
        setLayout([...layout, newLayoutItem]);
        handleClose();
    };
    
    // Reset state and close modal
    const handleClose = () => {
        onClose();
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        className="bg-white/90 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="p-8">
                            <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Create a New Insight</h2>
                            <p className="text-center text-gray-500 mb-8">Describe the data you want to visualize.</p>

                            {/* --- Prompt Input Area --- */}
                            <div className="flex items-center space-x-4 mb-8">
                                <textarea
                                    className="w-full px-4 py-3 text-gray-700 bg-white-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                                    rows="2"
                                    placeholder="e.g., 'Show top 5 car models with the highest warranty claims this year'"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    disabled={isLoading}
                                />
                                <motion.button
                                    onClick={handleGenerateWidget}
                                    className="px-6 py-4 bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                    whileHover={{ scale: isLoading ? 1 : 1.05 }}
                                    whileTap={{ scale: isLoading ? 1 : 0.95 }}
                                >
                                    {isLoading ? 'Generating...' : 'Generate'}
                                </motion.button>
                            </div>

                            {/* --- Preview Section --- */}
                            <AnimatePresence>
                                {(isLoading || widgetPreview) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <div className="border-t-2 border-gray-200 pt-6">
                                            {isLoading && (
                                                <div className="flex flex-col items-center justify-center h-80">
                                                    <motion.div
                                                        className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    />
                                                    <p className="mt-4 text-gray-600">AI is analyzing your request...</p>
                                                </div>
                                            )}
                                            {step === 'preview' && widgetPreview && (
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">{widgetPreview.title}</h3>
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                                                        {/* Chart Preview */}
                                                        <div className="bg-white/80 p-4 rounded-lg shadow-inner">
                                                            <Bar options={widgetPreview.config.options} data={widgetPreview.config.data} />
                                                        </div>
                                                        {/* Table Preview */}
                                                        <div className="bg-white/80 p-4 rounded-lg shadow-inner overflow-y-auto">
                                                            <table className="w-full text-left">
                                                                <thead className="sticky top-0 bg-gray-100">
                                                                    <tr>
                                                                        {widgetPreview.tableData.headers.map(header => (
                                                                            <th key={header} className="p-3 text-sm font-semibold text-gray-600">{header}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {widgetPreview.tableData.rows.map((row, index) => (
                                                                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                                                            {row.map((cell, cellIndex) => (
                                                                                <td key={cellIndex} className="p-3 text-gray-700">{cell}</td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* --- Action Buttons --- */}
                        <div className="bg-gray-50/70 p-4 flex justify-end items-center space-x-4">
                            {step === 'preview' && !isLoading && (
                                <motion.div className="flex space-x-4" initial={{opacity: 0}} animate={{opacity: 1}}>
                                     <button
                                        onClick={handleGenerateWidget}
                                        className="font-semibold text-gray-600 hover:text-blue-600 px-4 py-2 rounded-md"
                                    >
                                        Retry
                                    </button>
                                    <motion.button
                                        onClick={handleAcceptWidget}
                                        className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Accept and Add
                                    </motion.button>
                                </motion.div>
                            )}
                            <button onClick={handleClose} className="font-semibold text-gray-500 hover:text-gray-800 px-4 py-2">Cancel</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreateGraphModal;
