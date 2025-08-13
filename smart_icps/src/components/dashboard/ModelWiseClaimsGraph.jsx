import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';

// --- SVG Icon Component (Unchanged) ---
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// --- Static Data and Constants for Forecast View (Unchanged) ---
const forecastData = [
    { modelName: 'MAZDA CX 90', 2026: 1000, 2027: 1050, 2028: 1100, 2029: 1150, 2030: 1200 },
    { modelName: 'MAZDA CX 50', 2026: 1000, 2027: 1050, 2028: 1100, 2029: 1150, 2030: 1200 },
    { modelName: 'MAZDA MIATA RF', 2026: 950, 2027: 1000, 2028: 1050, 2029: 1100, 2030: 1150 },
].sort((a, b) => (b['2026'] + b['2027'] + b['2028'] + b['2029'] + b['2030']) - (a['2026'] + a['2027'] + a['2028'] + a['2029'] + a['2030']));

const forecastYears = ['2026', '2027', '2028', '2029', '2030'];
const forecastColors = { 2026: '#6D9DC5', 2027: '#A5C882', 2028: '#E5B181', 2029: '#D198C5', 2030: '#C4C1E0' };
const PARTS_COLORS = { actual: '#78350f', predicted: '#f59e0b' };

const CURRENT_DATE = new Date();

// --- NEW: Dynamic Color Generation Utility ---
const generateColorPalettes = (models) => {
    const actual = {};
    const predicted = {};
    models.forEach((model, index) => {
        const hue = (index * 45) % 360; // Distribute hues across the color wheel
        actual[model] = `hsl(${hue}, 70%, 45%)`;    // Darker shade for actual
        predicted[model] = `hsl(${hue}, 70%, 65%)`; // Lighter shade for predicted
    });
    return { actualColors: actual, predictedColors: predicted };
};


// --- REVISED: Data Processing Function ---
// Now accepts `modelNames` as a parameter instead of using a global constant.
const processTimeSeriesData = (data, period, modelNames) => {
    if (!data || modelNames.length === 0) return { chartData: [], partData: {} };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fullTimeSeries = [];
    if (period === 'WTD') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            fullTimeSeries.push({ date: day, key: day.toLocaleDateString('en-US', { weekday: 'short' }) });
        }
    } else if (period === 'MTD') {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(today.getFullYear(), today.getMonth(), i);
            fullTimeSeries.push({ date: day, key: i.toString() });
        }
    } else { // YTD
        for (let i = 0; i < 12; i++) {
            const day = new Date(today.getFullYear(), i, 1);
            fullTimeSeries.push({ date: day, key: day.toLocaleDateString('en-US', { month: 'short' }) });
        }
    }

    const aggregatedData = {};
    const partData = {};

    for (const dateStr in data) {
        const entryDate = new Date(dateStr);
        const dataKey = period === 'YTD' ? entryDate.toLocaleDateString('en-US', { month: 'short' }) : dateStr;

        if (!aggregatedData[dataKey]) aggregatedData[dataKey] = {};

        for (const model in data[dateStr]) {
            if (!aggregatedData[dataKey][model]) {
                aggregatedData[dataKey][model] = { total_actual_claims: 0, total_predicted_claims: 0 };
            }
            aggregatedData[dataKey][model].total_actual_claims += data[dateStr][model].total_actual_claims;
            aggregatedData[dataKey][model].total_predicted_claims += data[dateStr][model].total_predicted_claims;

            // Only aggregate parts for dates up to today
            if (entryDate <= today) {
                if (!partData[model]) partData[model] = { actual_parts: {}, predicted_parts: {} };
                Object.entries(data[dateStr][model].actual_parts).forEach(([part, count]) => {
                    partData[model].actual_parts[part] = (partData[model].actual_parts[part] || 0) + count;
                });
                Object.entries(data[dateStr][model].predicted_parts).forEach(([part, count]) => {
                    partData[model].predicted_parts[part] = (partData[model].predicted_parts[part] || 0) + count;
                });
            }
        }
    }

    const finalChartData = fullTimeSeries.map(({ date, key }) => {
        const entry = { name: key };
        const dataKey = period === 'YTD' ? key : date.toISOString().split('T')[0];
        const dayData = aggregatedData[dataKey];

        modelNames.forEach(model => {
            const actualKey = `${model}_actual`;
            const predictedKey = `${model}_predicted`;
            const modelData = dayData ? dayData[model] : null;

            if (date <= today) {
                entry[actualKey] = modelData?.total_actual_claims || 0;
                entry[predictedKey] = modelData?.total_predicted_claims || 0;
            } else {
                entry[actualKey] = 0; // No actuals for the future
                entry[predictedKey] = modelData?.total_predicted_claims || 0;
            }
        });
        return entry;
    });

    return { chartData: finalChartData, partData };
};

// --- Child Components (Unchanged) ---
const TimeSeriesTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
                <p className="font-bold text-gray-800">{label}</p>
                {payload.map((pld, index) => (
                    <div key={index} style={{ color: pld.fill }}>
                        {`${pld.name}: ${pld.value.toLocaleString()}`}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};
const ForecastTooltip = ({ active, payload, label }) => { /* ... As in original ... */ };
const PartWiseClaimsModal = ({ isOpen, onClose, data, period }) => { /* ... As in original ... */ };

// --- Main Dashboard Component (REVISED) ---
const MazdaClaimsDashboard = () => {
    const [dailyClaimsData, setDailyClaimsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('YTD');
    const [modalData, setModalData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeForecastYears, setActiveForecastYears] = useState(
        forecastYears.reduce((acc, year) => ({ ...acc, [year]: true }), {})
    );

  useEffect(() => {
    fetch('http://127.0.0.1:8000/forecast-claims/')
      .then(res => res.ok ? res.json() : Promise.reject(new Error('API error')))
      .then(data => {
        setDailyClaimsData(data.data); // use `data.data` to access actual forecast
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
    // --- REVISED: Dynamic model name and color generation ---
    const modelNames = useMemo(() => {
        if (!dailyClaimsData) return [];
        const allNames = new Set();
        Object.values(dailyClaimsData).forEach(dateEntry => {
            Object.keys(dateEntry).forEach(modelName => allNames.add(modelName));
        });
        return Array.from(allNames).sort();
    }, [dailyClaimsData]);

    const { actualColors, predictedColors } = useMemo(() => generateColorPalettes(modelNames), [modelNames]);

    const { chartData, partData } = useMemo(() => {
        if (selectedPeriod === 'Forecast') return { chartData: forecastData, partData: {} };
        return processTimeSeriesData(dailyClaimsData, selectedPeriod, modelNames);
    }, [selectedPeriod, dailyClaimsData, modelNames]);


    const handleBarClick = (data, index, event) => {
        if (!event || selectedPeriod === 'Forecast' || !event.tooltipPayload) return;
        const payload = event.tooltipPayload[0];
        const modelKey = payload.dataKey.replace('_actual', '').replace('_predicted', '');
        if (partData[modelKey]) {
            setModalData({ modelName: modelKey.replace(/_/g, ' '), parts: partData[modelKey] });
            setIsModalOpen(true);
        }
    };

    const closeModal = () => setIsModalOpen(false);
    const handleLegendClick = (data) => setActiveForecastYears(prev => ({ ...prev, [data.dataKey]: !prev[data.dataKey] }));

    if (loading) return <div className="p-8 text-center text-lg">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
    if (!dailyClaimsData) return <div className="p-8 text-center text-lg">No data available.</div>;

    const periodLabels = {
        'YTD': `Yearly model wise Claims Distribution (${CURRENT_DATE.getFullYear()})`,
        'MTD': `Monthly  model wise  Claims Distribution (${CURRENT_DATE.toLocaleDateString('en-US', { month: 'long' })})`,
        'WTD': 'Weekly  model wise  Claims Distribution'
    };
    const chartTitle = periodLabels[selectedPeriod];

    return (
        <div className="bg-gray-50 p-6 rounded-2xl shadow-lg border border-gray-200 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">{chartTitle}</h1>
                <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="bg-white border border-gray-300 rounded-lg py-2 px-4">
                    <option value="YTD">YTD</option>
                    <option value="MTD">MTD</option>
                    <option value="WTD">WTD</option>
                    
                </select>
            </div>

            <div className="w-full h-[550px]">
                {selectedPeriod === 'Forecast' ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="modelName" type="category" angle={-45} textAnchor="end" height={80} />
                            <YAxis label={{ value: "Forecasted Claims", angle: -90, position: "insideLeft" }} />
                            <Tooltip content={<ForecastTooltip />} cursor={{ fill: 'rgba(200, 200, 200, 0.2)' }} />
                            <Legend onClick={handleLegendClick} />
                            {forecastYears.map(year => (
                                <Bar key={year} dataKey={year} stackId="a" fill={forecastColors[year]} hide={!activeForecastYears[year]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip content={<TimeSeriesTooltip />} />
                            <Legend />
                            {/* --- REVISED: Dynamic Bar Generation --- */}
                            {modelNames.map(model => (
                                <React.Fragment key={model}>
                                    <Bar
                                        dataKey={`${model}_actual`}
                                        name={`${model.replace(/_/g, ' ')} Actual`}
                                        fill={actualColors[model]}
                                        stackId="actual"
                                        onClick={handleBarClick}
                                        className="cursor-pointer" />
                                    <Bar
                                        dataKey={`${model}_predicted`}
                                        name={`${model.replace(/_/g, ' ')} Predicted`}
                                        fill={predictedColors[model]}
                                        stackId="predicted"
                                        onClick={handleBarClick}
                                        className="cursor-pointer" />
                                </React.Fragment>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <PartWiseClaimsModal isOpen={isModalOpen} onClose={closeModal} data={modalData} period={selectedPeriod} />
        </div>
    );
};

export default MazdaClaimsDashboard;