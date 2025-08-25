import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowUp,
    ArrowDown,
    Sparkles,
    TrendingUp,
    DollarSign,
    Hourglass,
    ClipboardList
} from 'lucide-react';
import config from '../../config';

const CountUp = ({ target, isCurrency = false }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        if (typeof target !== 'number') {
            setCount(target ?? 0);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    let start = 0;
                    const end = target;
                    if (start === end) {
                        setCount(target);
                        return;
                    };

                    let duration = 1500; // 1.5 seconds
                    let startTime = null;

                    const animate = (currentTime) => {
                        if (startTime === null) startTime = currentTime;
                        const progress = Math.min((currentTime - startTime) / duration, 1);
                        const currentNum = progress * (end - start) + start;

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

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.disconnect()
            }
        };
    }, [target]);

    const formatDisplay = () => {
        if (typeof count !== 'number' || isNaN(count)) {
            return isCurrency ? '$0.00' : '0';
        }

        if (isCurrency) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(count);
        }
        return count.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    return <span ref={ref}>{formatDisplay()}</span>;
};


const HistoricalChangeIndicator = ({ data, period }) => {
    const isUp = data.historicalChangeType === 'up';
    const icon = isUp ? <ArrowUp size={16} className="inline" /> : <ArrowDown size={16} className="inline" />;
    const textColor = isUp ? 'text-green-500' : 'text-red-500';

    return (
        <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={`text-sm font-medium ${textColor} flex items-center gap-1`}
        >
            {icon}
            {data.historicalChange}% vs last {period}
        </motion.p>
    );
};

/**
 * AIPredictionCard displays key metrics, AI projections, and associated costs.
 * It features animated numbers and a period selector.
 * @param {object} props - The component props.
 * @param {string} props.title - The title of the card (e.g., "Total Claims").
 * @param {string} props.color - The theme color for the card (e.g., 'blue', 'green').
 * @param {object} props.data - The data object for the current period.
 * @param {string} props.period - The currently selected time period ('week', 'month', 'year').
 * @param {function} props.onPeriodChange - Callback function to change the period.
 * @param {React.ElementType} [props.pendingVolumeIcon=Hourglass] - Optional icon for the pending volume section.
 */
const AIPredictionCard = ({ title, color, code,dummydata, period, onPeriodChange, pendingVolumeIcon: PendingVolumeIcon = Hourglass }) => {
    const styles = {
        border: `border-${color}-500`,
        text: `text-${color}-500`,
        bg: `bg-${color}-100`,
        iconBg: `bg-${color}-500`
    };

    const [data, setData] = useState(dummydata);  // ✅ renamed from summary to data
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const periodOptions = ['week', 'month', 'year'];

    useEffect(() => {
        if (!code) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            console.log("Fetching data for code:", code);

            try {
                const response = await fetch(`${config.API_BASE_URL}/ai-data-card/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status_code: code }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Unknown error occurred");
                }

                const result = await response.json();
                console.log("Fetched data:", result.data);
                setData(result.data[period]);  // ✅ storing in `data`
            } catch (err) {
                setError(err.message);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [code, period]);



    // Calculate the volume to be processed, ensuring it's not negative.
    const toBeProcessedVolume = Math.max(0, data.projectedClaim - data.originalClaim);

    return (
        <div className={`bg-white rounded-xl shadow-lg p-6 flex flex-col border-l-4 ${styles.border} transition-all duration-300 w-full`}>
            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-4">
                <h6 className={`font-bold uppercase text-xs tracking-wider ${styles.text}`}>{title}</h6>
                <div className="bg-gray-100 p-1 rounded-full flex items-center space-x-1">
                    {periodOptions.map(p => (
                        <button
                            key={p}
                            onClick={() => onPeriodChange(p)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${period === p ? `${styles.iconBg} text-white shadow` : 'text-gray-500 hover:bg-gray-200'}`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- ORIGINAL CLAIM DATA & COST --- */}
            <motion.div
                key={period}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-grow"
            >
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-5xl font-bold text-gray-800">
                            <CountUp target={data.originalClaim} />
                        </h3>
                        {/* <HistoricalChangeIndicator data={data} period={period} /> */}
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-bold ${styles.text}`}>Cost</p>
                        <h4 className="text-xl font-bold text-gray-800">
                            <CountUp target={data.cost} isCurrency={true} />
                        </h4>
                    </div>
                </div>
            </motion.div>

            <hr className="my-6 border-gray-200" />

            {/* --- AI PREDICTION SECTION --- */}
            <motion.div
                key={`${period}-details`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className={`p-4 rounded-lg ${styles.bg}`}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full text-white ${styles.iconBg} shadow-md`}>
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${styles.text}`}>AI Projected {title.toLocaleLowerCase()}</p>
                            <p className="text-xs text-gray-500">Current {period}'s projection{period === "year" ? "(YTD)" : period === "month" ? "(MTD)" : period === "week" ? "(WTD)" : ""}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h4 className="text-2xl font-bold text-gray-800">
                            <CountUp target={data.projectedClaim} />
                        </h4>
                        <p className={`text-sm font-semibold text-green-500 flex items-center justify-end gap-1`}>
                            <TrendingUp size={14} />
                            {data.percentageIncrease}%
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* --- TO BE PROCESSED SECTION --- */}
            <motion.div
                key={`${period}-to-be-processed`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className={`mt-4 p-4 rounded-lg ${styles.bg}`}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full text-white ${styles.iconBg} shadow-md`}>
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${styles.text}`}>To Be Processed</p>
                            <p className="text-xs text-gray-500">Projected increase in claim volume</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h4 className="text-2xl font-bold text-gray-800">
                            {toBeProcessedVolume > 0 && '+' /* Conditionally show + sign */}
                            <CountUp target={toBeProcessedVolume} />
                        </h4>
                    </div>
                </div>
            </motion.div>

            {/* --- PENDING VOLUME SECTION --- */}
            {data.pendingVolume !== undefined && (
                <motion.div
                    key={`${period}-pending-volume`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className={`mt-4 p-4 rounded-lg ${styles.bg}`}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full text-white ${styles.iconBg} shadow-md`}>
                                <PendingVolumeIcon size={20} />
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${styles.text}`}>Pending Volume</p>
                                <p className="text-xs text-gray-500">Claims to be processed for this {period}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h4 className="text-2xl font-bold text-gray-800">
                                <CountUp target={data.pendingVolume} />
                            </h4>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default AIPredictionCard;