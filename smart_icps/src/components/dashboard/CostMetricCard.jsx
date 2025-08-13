import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

// A reusable CountUp component to animate numbers
const CountUp = ({ target, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    let start = 0;
                    const end = target;
                    if (start === end) {
                        setCount(target);
                        return;
                    }

                    let duration = 1500;
                    let startTime = null;

                    const animate = (currentTime) => {
                        if (startTime === null) startTime = currentTime;
                        const progress = Math.min((currentTime - startTime) / duration, 1);
                        const currentNum = Math.floor(progress * (end - start) + start);
                        
                        setCount(currentNum);

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        } else {
                            setCount(target); // Ensure it ends on the exact target
                        }
                    };
                    requestAnimationFrame(animate);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if(ref.current) {
                observer.disconnect()
            }
        };
    }, [target]);

    return (
        <span ref={ref}>
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
};

// The new CostMetricCard component
const CostMetricCard = ({ title, color, data, period, onPeriodChange }) => {
    // Style configuration based on the color prop
    const styles = {
        border: `border-${color}-500`,
        text: `text-${color}-500`,
        bg: `bg-${color}-500`,
        lightBg: `bg-${color}-100`,
        hoverBg: `hover:bg-${color}-600`,
        shadow: `shadow-${color}-500/20`
    };
    
    // Component for the change indicator
    const ChangeIndicator = () => {
        if (data.changeType === 'same' || data.change === 0) {
            return <p className="text-sm text-gray-400">No change</p>;
        }
        
        const isUp = data.changeType === 'up';
        const icon = isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
        const textColor = isUp ? 'text-green-500' : 'text-red-500';

        return (
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${textColor}`}>
                {icon}
                <span>{data.change}%</span>
            </div>
        );
    };


    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`relative bg-white rounded-xl shadow-lg p-5 flex flex-col border-l-8 ${styles.border} overflow-hidden`}
        >
            {/* Decorative background element */}
            <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full ${styles.lightBg} opacity-50`}></div>
            {/* <DollarSign size={28} className={`absolute top-4 right-4 ${styles.text} opacity-20`} /> */}

            {/* Card Header */}
            <div className="flex justify-between items-center mb-2 z-10">
                 <h6 className={`font-bold uppercase text-xs tracking-wider ${styles.text}`}>{title}</h6>
                 <ChangeIndicator />
            </div>

            {/* Main Content */}
            <div className="flex-grow flex items-center mt-2 z-10">
                <AnimatePresence mode="wait">
                    <motion.h3 
                        key={data.cost}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className={`text-4xl font-bold text-gray-800 ${styles.text}`}
                    >
                        <CountUp target={data.cost} prefix="$" />
                        
                    </motion.h3>
                </AnimatePresence>
            </div>
             <p className="text-xs text-gray-400 mt-3 z-10">Cost for {period}ly projection</p>
        </motion.div>
    );
};

export default CostMetricCard;