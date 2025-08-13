import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer, Legend } from 'recharts';
import GraphLoader from '../common/GraphLoader';

// --- (Keep your Custom Components: renderActiveShape, CustomLegend) ---
// Note: renderActiveShape has a small fix to get total and year from the payload.
const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

    return (
        <g>
            {/* Center Text: Year and Total */}
            <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#334155" className="text-2xl font-bold">
                {payload.year}
            </text>
            <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#64748B" className="text-sm">
                Total Claims: {payload.total.toLocaleString()}
            </text>

            {/* Enlarged active slice */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: `drop-shadow(0px 4px 10px ${fill})` }}
            />

            {/* Label for the active slice */}
            <text x={cx} y={cy + outerRadius + 25} textAnchor="middle" fill={fill} className="text-base font-semibold">
                {`${payload.name}: ${payload.value.toLocaleString()}`}
            </text>
        </g>
    );
};

const CustomLegend = ({ payload, onLegendClick, hiddenSectors }) => {
    return (
        <div className="w-full mt-4">
            <ul className="flex flex-wrap justify-center text-sm text-gray-600">
                {payload.map((entry, index) => {
                    const isHidden = hiddenSectors.includes(entry.value);
                    const percentage = entry.payload.percentage;

                    return (
                        <li
                            key={`item-${index}`}
                            className={`flex items-center mr-4 mb-2 cursor-pointer transition-opacity ${isHidden ? 'opacity-40' : 'opacity-100'}`}
                            onClick={() => onLegendClick(entry.value)}
                        >
                            <span className="w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span>{entry.value} ({percentage !== undefined ? `${percentage.toFixed(0)}%` : ''})</span>
                        </li>
                    )
                })}
            </ul>
        </div>
    );
}


// --- Main Donut Chart Component ---
const InteractiveDonutChart = ({ year }) => {
    // State for the raw data from the API
    const [chartData, setChartData] = useState([]);
    // State for the hovered slice index
    const [activeIndex, setActiveIndex] = useState(null);
    // State to track names of hidden slices
    const [hiddenSectors, setHiddenSectors] = useState([]);
    // State for API errors
    const [error, setError] = useState(null);
    // State for loading state (optional, can be used to show a loading spinner)
    const [isLoading, setIsLoading] = useState(false);
    

    // --- Data Fetching ---
    useEffect(() => {
        if (!year) return;

        const fetchStatusDistribution = async () => {
            try {
                // Reset states for the new year
                setChartData([]);
                setHiddenSectors([]);
                setActiveIndex(null);
                setError(null);
                setIsLoading(true);

                const response = await fetch("http://127.0.0.1:8000/claim-status-distribution/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ year }),
                });
                setIsLoading(false);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Something went wrong");
                }

                const resJson = await response.json();
                // Set the chart data directly from the API response
                setChartData(resJson.data);

            } catch (err) {
                console.error("Error fetching claim status distribution:", err.message);
                setError(err.message);
            }
        };

        fetchStatusDistribution();
    }, [year]); // This effect re-runs whenever the 'year' prop changes

    // --- Memoized Calculations ---

    // Calculate the total value from the original chartData
    const totalValue = useMemo(() => {
        return chartData.reduce((sum, entry) => sum + entry.value, 0);
    }, [chartData]);

    // Filter the data for the chart based on hidden sectors
    const filteredChartData = useMemo(() => {
        // Add total and year to each data point for access in renderActiveShape
        const dataWithTotal = chartData.map(d => ({ ...d, total: totalValue, year }));
        return dataWithTotal.filter(d => !hiddenSectors.includes(d.name));
    }, [chartData, hiddenSectors, totalValue, year]);

    // --- Event Handlers ---

    // Toggle hidden sectors on legend click
    const handleLegendClick = useCallback((name) => {
        setHiddenSectors(prevHidden =>
            prevHidden.includes(name)
                ? prevHidden.filter(sectorName => sectorName !== name)
                : [...prevHidden, name]
        );
    }, []);

    // Handlers for mouse hover events on the pie slices
    const onPieEnter = useCallback((_, index) => {
        setActiveIndex(index);
    }, []);

    const onPieLeave = useCallback(() => {
        setActiveIndex(null);
    }, []);

    // --- Render Logic ---

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }
    

    return (
        <div className="bg-white h-full rounded-xl shadow-lg p-6 w-full max-w-lg mx-auto flex flex-col items-center">
            <h2 className="text-xl font-semibold text-gray-800 self-start">Claims Status for {year}</h2>
           { isLoading ?<GraphLoader  />:
            <div className="w-full h-96 relative">
                {/* Always visible centered text when not hovering */}
                {activeIndex === null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-2xl font-bold text-gray-700">{year}</p>
                        <p className="text-sm text-gray-500">Total Claims: {totalValue.toLocaleString()}</p>
                    </div>
                )}

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={filteredChartData} // Use filtered data for rendering
                            cx="50%"
                            cy="50%"
                            innerRadius={'60%'}
                            outerRadius={'80%'}
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                        >
                            {filteredChartData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Legend
                            // Pass necessary props to the custom legend component
                            content={<CustomLegend onLegendClick={handleLegendClick} hiddenSectors={hiddenSectors} />}
                            verticalAlign="bottom"
                            wrapperStyle={{ bottom: 10, position: 'relative' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>}
        </div>
    );
};

export default InteractiveDonutChart;