import React, { useState, useEffect, useCallback } from 'react';

// Main App Component to provide a consistent preview environment
const App = () => {
    return (
        <div className="bg-gray-50 min-h-screen font-sans p-4">
            <PredictiveInsightCarousel />
        </div>
    );
};

// Data for the predictive insights carousel
const predictiveInsights = [
    { 
        title: "PREDICTIVE INSIGHT", 
        message: "Based on current trend analysis, we anticipate that over <strong class='text-blue-600'>50+</strong> new claims will be submitted this week.", 
        icon: "M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.773 4.773zM21 12a9 9 0 11-18 0 9 9 0 0118 0z", 
        type: "info",
        color: "blue"
    },
    { 
        title: "APPROVAL FORECAST", 
        message: "Based on recent performance trends, claim approvals are projected to rise by <strong class='text-green-600'>+12.35%</strong> this week.", 
        icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", 
        type: "success",
        color: "green"
    },
    { 
        title: "REJECTION FORECAST", 
        message: "Policy improvements and streamlined claim validation are projected to reduce rejections by <strong class='text-red-600'>-2.35%</strong> this week.", 
        icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z", 
        type: "danger",
        color: "red"
    }
];

// PredictiveInsightCarousel Component with updated glass effect buttons
const PredictiveInsightCarousel = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [insights, setInsights] = useState(predictiveInsights);

    const nextSlide = useCallback(() => {
        setActiveIndex(prev => (prev + 1) % insights.length);
    }, [insights.length]);

    const prevSlide = () => {
        setActiveIndex(prev => (prev - 1 + insights.length) % insights.length);
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            nextSlide();
        }, 7000);
        return () => clearInterval(interval);
    }, [nextSlide]);

    const cardColors = {
        info: 'from-blue-50 to-white',
        success: 'from-green-50 to-white',
        danger: 'from-red-50 to-white',
    };

    return (
        <section className="w-full">
            <div className="flex items-center mt-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0014 18.5h-4a3.375 3.375 0 00-2.652-1.453l-.548-.547z" />
                </svg>
                <h2 className="text-2xl font-bold text-gray-800">AI Forecast Notifications ✨</h2>
            </div>
            
            <div className="relative flex items-center h-48 md:h-40">
                
                <div className="absolute inset-0 z-20 flex items-center justify-between px-2 pointer-events-none">
                    {/* ✨ GLASS EFFECT CLASSES UPDATED ✨ */}
                    <button 
                        onClick={prevSlide} 
                        className="p-2 rounded-full bg-white/50 backdrop-blur-md hover:bg-white/75 text-gray-800 border border-white/40 shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto" 
                        aria-label="Previous slide"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    {/* ✨ GLASS EFFECT CLASSES UPDATED ✨ */}
                    <button 
                        onClick={nextSlide} 
                        className="p-2 rounded-full bg-white/50 backdrop-blur-md hover:bg-white/75 text-gray-800 border border-white/40 shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto" 
                        aria-label="Next slide"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Map through insights to create carousel slides */}
                {insights.map((insight, index) => (
                    <div 
                        key={index} 
                        className={`absolute px-8 w-full transition-all duration-700 ease-in-out transform ${activeIndex === index ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
                        style={{ zIndex: activeIndex === index ? 10 : 0 }}
                    >
                        <div className={`bg-gradient-to-br ${cardColors[insight.type]} border border-gray-200 rounded-2xl p-6 flex items-center space-x-6 shadow-lg shadow-gray-200/50`}>
                            <div className="flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 text-${insight.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={insight.icon} />
                                </svg>
                            </div>
                            <div className="text-container">
                                <h5 className={`font-bold text-sm uppercase tracking-wider text-${insight.color}-500 mb-1`}>{insight.title}</h5>
                                <p className="text-base text-gray-700" dangerouslySetInnerHTML={{ __html: insight.message }}></p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Dots */}
            <div className="flex items-center justify-center mt-2">
                <div className="flex space-x-2">
                    {insights.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${activeIndex === index ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'}`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PredictiveInsightCarousel;