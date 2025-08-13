import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import AIPredictionCard from '../components/dashboard/AIPredictionCard';
import CountUp from '../components/dashboard/CountUp';
import CostMetricCard from '../components/dashboard/CostMetricCard';
import ClaimsTrendChart from '../components/dashboard/ClaimsTrendChart';
import InteractiveDonutChart from '../components/dashboard/InteractiveDonutChart';
import ModelWiseClaimsGraph from '../components/dashboard/ModelWiseClaimsGraph';
import InteractiveTable from '../components/dashboard/InteractiveTable';
import PredictiveInsightCarousel from '../components/dashboard/PredictiveInsightCarousel';
import { m } from 'framer-motion';


// Note: chartjs-plugin-datalabels is not available in this environment,
// so some chart labels might not be displayed. Functionality remains.

// --- DATA (Can be moved to a separate file for cleanliness) ---

const timePeriods = ['week', 'month', 'year'];
const claimsData = {
  total: {
    week: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    month: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    year: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    }
  },
  approved: {
    week: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    month: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    year: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    }
  },
  rejected: {
    week: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    month: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    year: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    }
  },
  pending: {
    week: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    month: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    },
    year: {
      originalClaim: 0,
      projectedClaim: 0,
      historicalChange: 0,
      historicalChangeType: 'same',
      percentageIncrease: 0,
      value: 0,
      change: 0,
      changeType: 'same',
      cost: 0
    }
  }
};
const modelData2025_monthly = {
    "Jan": { "MAZDA_CX_50": 70, "MAZDA_CX_90": 68, "MAZDA_CX_30": 65, "MAZDA_MIATA_RF": 62, "MAZDA_30_RHEV": 58, "MAZDA_3_Hatchback": 55, "MAZDA_6": 50, "MAZDA_CX_5": 48, "MAZDA_CX_70": 45 },
    "Feb": { "MAZDA_CX_50": 68, "MAZDA_CX_90": 65, "MAZDA_CX_30": 62, "MAZDA_MIATA_RF": 60, "MAZDA_30_RHEV": 55, "MAZDA_3_Hatchback": 52, "MAZDA_6": 48, "MAZDA_CX_5": 45, "MAZDA_CX_70": 42 },
    "Mar": { "MAZDA_CX_50": 75, "MAZDA_CX_90": 72, "MAZDA_CX_30": 70, "MAZDA_MIATA_RF": 68, "MAZDA_30_RHEV": 65, "MAZDA_3_Hatchback": 60, "MAZDA_6": 55, "MAZDA_CX_5": 52, "MAZDA_CX_70": 50 },
    "Apr": { "MAZDA_CX_50": 80, "MAZDA_CX_90": 78, "MAZDA_CX_30": 75, "MAZDA_MIATA_RF": 72, "MAZDA_30_RHEV": 70, "MAZDA_3_Hatchback": 65, "MAZDA_6": 60, "MAZDA_CX_5": 58, "MAZDA_CX_70": 55 },
    "May": { "MAZDA_CX_50": 85, "MAZDA_CX_90": 82, "MAZDA_CX_30": 80, "MAZDA_MIATA_RF": 78, "MAZDA_30_RHEV": 75, "MAZDA_3_Hatchback": 70, "MAZDA_6": 65, "MAZDA_CX_5": 62, "MAZDA_CX_70": 60 },
    "Jun": { "MAZDA_CX_50": 90, "MAZDA_CX_90": 88, "MAZDA_CX_30": 85, "MAZDA_MIATA_RF": 82, "MAZDA_30_RHEV": 80, "MAZDA_3_Hatchback": 75, "MAZDA_6": 70, "MAZDA_CX_5": 68, "MAZDA_CX_70": 65 },
    "Jul": { "MAZDA_CX_50": 95, "MAZDA_CX_90": 92, "MAZDA_CX_30": 90, "MAZDA_MIATA_RF": 88, "MAZDA_30_RHEV": 85, "MAZDA_3_Hatchback": 80, "MAZDA_6": 75, "MAZDA_CX_5": 72, "MAZDA_CX_70": 70 }
};

const calculateYTD = (monthlyData) => {
    const ytd = {};
    const models = Object.keys(monthlyData["Jan"]);
    models.forEach(model => ytd[model] = { totalClaims: 0, parts: {} });
    Object.keys(monthlyData).forEach(month => models.forEach(model => ytd[model].totalClaims += monthlyData[month][model]));
    models.forEach(model => {
        const total = ytd[model].totalClaims;
        ytd[model].parts = { "Major Component": Math.floor(total * 0.2), "Minor Component": Math.floor(total * 0.3), "Wear & Tear": Math.floor(total * 0.5) };
    });
    return ytd;
};

const modelData = {
    "2023": { "MAZDA_CX_90": { "totalClaims": 890, "parts": { "Fender": 120, "Headlight": 70 } }, "MAZDA_CX_50": { "totalClaims": 850, "parts": { "Bumper": 150, "Engine": 60 } } },
    "2024": { "MAZDA_CX_90": { "totalClaims": 950, "parts": { "Fender": 130, "Headlight": 80 } }, "MAZDA_CX_50": { "totalClaims": 920, "parts": { "Bumper": 160, "Engine": 65 } } },
    "2025": calculateYTD(modelData2025_monthly),
    "Monthly": { "MAZDA_CX_50": { "totalClaims": 95, "parts": { "Bumper": 15, "Engine": 8 } }, "MAZDA_CX_90": { "totalClaims": 92, "parts": { "Fender": 12, "Headlight": 7 } } },
    "Weekly": { "MAZDA_CX_50": { "totalClaims": 24, "parts": { "Bumper": 5 } }, "MAZDA_CX_90": { "totalClaims": 22, "parts": { "Headlight": 4 } } }
};

const claimsTrendDataByYear = {
    "2023": { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], data: [65, 68, 75, 85, 95, 110, 115, 112, 98, 90, 105, 120] },
    "2024": { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], data: [130, 125, 140, 150, 165, 180, 190, 185, 170, 160, 175, 195] },
    "2025": { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], data: [200, 190, 210, 225, 240, 260, 275] }
};


const recentActivityData = [
    { id: 12345, status: 'Approved', statusColor: 'text-green-500', lastUpdate: '2025-07-01', submittedBy: 'J. Doe' },
    { id: 12346, status: 'Pending', statusColor: 'text-yellow-500', lastUpdate: '2025-07-02', submittedBy: 'A. Smith' },
    { id: 12347, status: 'Rejected', statusColor: 'text-red-500', lastUpdate: '2025-06-30', submittedBy: 'E. Brown' },
    { id: 12348, status: 'Approved', statusColor: 'text-green-500', lastUpdate: '2025-06-28', submittedBy: 'J. Doe' },
    { id: 12349, status: 'Rejected', statusColor: 'text-red-500', lastUpdate: '2025-06-27', submittedBy: 'E. Brown' },
    { id: 12350, status: 'Approved', statusColor: 'text-green-500', lastUpdate: '2025-06-25', submittedBy: 'M. Jones' },
];

// --- Reusable Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h5 className="font-bold text-lg">{title}</h5>
                    <button onClick={onClose} className="text-black font-bold text-2xl leading-none p-0">&times;</button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ChartCard = ({ title, children, controls, customClasses = '' }) => (
    <div className={`bg-white rounded-lg shadow-md p-4 flex flex-col h-full ${customClasses}`}>
        <div className="flex justify-between items-center mb-3">
            <h6 className="font-bold text-gray-700 mb-0">{title}</h6>
            <div>{controls}</div>
        </div>
        <div className="flex-grow relative">{children}</div>
    </div>
);

const Loader = ({ text }) => (
    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg z-10">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-blue-600 font-semibold">{text}</p>
    </div>
);



const ClaimsPieChart = () => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [period, setPeriod] = useState('week');
    const data = { approved: claimsData.approved[period].value, rejected: claimsData.rejected[period].value, pending: claimsData.pending[period].value };
    const total = data.approved + data.rejected + data.pending;

    useEffect(() => {
        chartInstance.current = new Chart(chartRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Rejected', 'Pending'],
                datasets: [{ data: [], backgroundColor: ['#28a745', '#dc3545', '#ffc107'], borderColor: '#fff', borderWidth: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: false } } }
        });
        return () => chartInstance.current.destroy();
    }, []);

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.data.datasets[0].data = [data.approved, data.rejected, data.pending];
            chartInstance.current.update();
        }
    }, [period, data]);

    return (
        <ChartCard
            title="Claims Distribution"
            controls={
                <select onChange={(e) => setPeriod(e.target.value)} value={period} className="form-select-sm">
                    <option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option>
                </select>}>
            <div className="h-48 mb-4"><canvas ref={chartRef}></canvas></div>
            <div className="space-y-2 text-sm">
                <div className="legend-item"><div className="legend-color bg-green-500"></div>Approved: <strong>{((data.approved / total) * 100 || 0).toFixed(1)}%</strong></div>
                <div className="legend-item"><div className="legend-color bg-red-500"></div>Rejected: <strong>{((data.rejected / total) * 100 || 0).toFixed(1)}%</strong></div>
                <div className="legend-item"><div className="legend-color bg-yellow-500"></div>Pending: <strong>{((data.pending / total) * 100 || 0).toFixed(1)}%</strong></div>
            </div>
        </ChartCard>
    );
};

const ModelWiseChart = ({ onModelClick }) => {
    const chartRef = useRef(null);
    const buttonsRef = useRef(null);
    const chartInstance = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [period, setPeriod] = useState('2025');

    useEffect(() => {
        const chartCtx = chartRef.current.getContext('2d');
        chartInstance.current = new Chart(chartCtx, { type: 'bar', data: {}, options: {} });
        updateChart('2025');
        return () => chartInstance.current.destroy();
    }, []);

    useEffect(() => {
        updateChart(period);
    }, [period]);

    const updateChart = (currentPeriod) => {
        const dataForPeriod = modelData[currentPeriod];
        if (!dataForPeriod || !chartInstance.current) return;

        const sortedModels = Object.entries(dataForPeriod).sort(([, a], [, b]) => b.totalClaims - a.totalClaims);
        const labels = sortedModels.map(item => item[0].replace(/_/g, ' '));
        const data = sortedModels.map(item => item[1].totalClaims);

        chartRef.current.parentElement.style.height = `${Math.max(labels.length * 38 + 60, 300)}px`;

        chartInstance.current.data = { labels, datasets: [{ label: 'Number of Claims', data, backgroundColor: '#007bff', borderRadius: 4 }] };
        chartInstance.current.options = {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 40 } },
            scales: { x: { beginAtZero: true }, y: { grid: { display: false } } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => `Claims: ${c.parsed.x.toLocaleString()}` } }
            },
            animation: {
                onComplete: (anim) => {
                    const chart = anim.chart;
                    const chartArea = chart.chartArea;
                    const plusButtonsContainer = buttonsRef.current;
                    if (!chart.getDatasetMeta(0).data.length || !chartArea || !plusButtonsContainer) return;

                    plusButtonsContainer.innerHTML = '';
                    const meta = chart.getDatasetMeta(0);
                    meta.data.forEach((bar, index) => {
                        const modelName = chart.data.labels[index].replace(/ /g, '_');
                        const btn = document.createElement('button');
                        btn.textContent = '+';
                        btn.className = 'plus-button';
                        btn.style.top = `${bar.y - 11}px`;
                        btn.style.left = `${chartArea.right + 5}px`;
                        btn.onclick = (e) => { e.stopPropagation(); onModelClick(modelName, currentPeriod); };
                        plusButtonsContainer.appendChild(btn);
                    });
                }
            }
        };
        chartInstance.current.update();
    };

    const handlePeriodChange = (e) => setPeriod(e.target.value);

    return (
        <ChartCard
            title={`Model-wise Claims (${period})`}
            controls={
                <select onChange={handlePeriodChange} value={period} className="form-select-sm">
                    <option value="2025">2025 (YTD)</option><option value="2024">2024</option><option value="2023">2023</option><option value="Monthly">Monthly</option><option value="Weekly">Weekly</option>
                </select>}>
            {isLoading && <Loader text="Loading..." />}
            <div className="relative w-full h-full">
                <canvas ref={chartRef}></canvas>
                <div ref={buttonsRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></div>
            </div>
        </ChartCard>
    );
};

const RecentActivity = ({ searchTerm, onSearchChange }) => {
    const filteredData = recentActivityData.filter(activity =>
        Object.values(activity).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <ChartCard title="Recent Activity" customClasses="activity-card" controls={
            <input
                type="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={onSearchChange}
                className="form-input-sm"
            />
        }>
            <div className="overflow-auto flex-grow">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-800 text-white uppercase text-xs sticky top-0">
                        <tr>
                            <th className="p-2">Claim ID</th><th className="p-2">Status</th><th className="p-2">Last Update</th><th className="p-2">Submitted By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredData.length > 0 ? filteredData.map(activity => (
                            <tr key={activity.id} className="hover:bg-gray-50">
                                <td className="p-2 font-medium">{activity.id}</td>
                                <td className={`p-2 font-semibold ${activity.statusColor}`}>{activity.status}</td>
                                <td className="p-2">{activity.lastUpdate}</td>
                                <td className="p-2">{activity.submittedBy}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="text-center p-4">No matching records found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ChartCard>
    );
};

const ModelPartsChart = ({ model, period }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        const parts = modelData[period]?.[model]?.parts || {};
        const chartInstance = new Chart(chartRef.current, {
            type: 'bar',
            data: {
                labels: Object.keys(parts),
                datasets: [{ label: 'No of Claims', data: Object.values(parts), backgroundColor: '#28a745', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
        return () => chartInstance.destroy();
    }, [model, period]);

    return <div className="h-64"><canvas ref={chartRef}></canvas></div>
};


// --- Main App Component ---

const LandingPage = () => {
    // This state object holds the current index (0 for week, 1 for month, 2 for year) for EACH metric card.
    // const [periodIndices, setPeriodIndices] = useState({ total: "week", approved: "week", rejected: "week", pending: "week" });
    const [periodIndices, setPeriodIndices] = useState({ total: "week", approved: "week", rejected: "week", pending: "week" });
    const [year, setYear] = useState("2025");

    const [modelModal, setModelModal] = useState({ isOpen: false, model: null, period: null });
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [activitySearchTerm, setActivitySearchTerm] = useState('');

    // This function is called when a user clicks an arrow button on a MetricCard.
    // It receives the card's name (e.g., 'total') and the direction ('prev' or 'next').
    const handlePeriodChange = (cardName, periodValue) => {
        if (!timePeriods.includes(periodValue)) {
            console.warn(`Invalid period value: ${periodValue}`);
            return;
        }

        setPeriodIndices({
            total: periodValue,
            approved: periodValue,
            rejected: periodValue,
            pending: periodValue
        });
    };

    const handleModelClick = (model, period) => setModelModal({ isOpen: true, model, period });

    return (
        <div className="min-h-screen font-sans">
            <main className="container mx-auto mt-4 px-4">
                <PredictiveInsightCarousel />

                {/* Claims and Cost Data Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
                    {/* AI Prediction Cards */}
                    {Object.keys(claimsData).map(key => {
                        const cardDetails = {
                            total: { title: "Total Claims", color: "blue",code:'T' },
                            approved: { title: "Approved Claims", color: "green", code: "A" },
                            rejected: { title: "Rejected Claims", color: "red", code: "R" },
                            pending: { title: "Pending Claims", color: "yellow", code: "P" },
                        };
                        console.log(`Rendering card for: ${key}`, claimsData[key][periodIndices[key]]);
                        return <AIPredictionCard
                            key={`claim-${key}`}
                            code={cardDetails[key].code}
                            title={cardDetails[key].title}
                            color={cardDetails[key].color}
                            dummydata={claimsData[key][periodIndices[key]]}
                            period={periodIndices[key]}
                            onPeriodChange={(dir) => handlePeriodChange(key, dir)}
                        />;
                    })}
                </div>

               

                {/* Charts and Activity Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                    {/* Container for the two charts */}
                    <div className="lg:col-span-8">
                        <ClaimsTrendChart setYear={setYear} />
                    </div>
                    <div className="lg:col-span-4">
                        <InteractiveDonutChart year={year} />
                    </div>

                    {/* New row for the Model-wise claims and recent activity table */}
                    <div className="lg:col-span-12">
                        <ModelWiseClaimsGraph />
                    </div>
                    <div className="lg:col-span-12">
                        <InteractiveTable />
                    </div>
                </div>
            </main>

            <footer className="bg-gray-800 text-white text-center py-3 mt-8">
                <p className="text-sm">&copy; 2025 YOUR COMPANY | ALL RIGHTS RESERVED</p>
            </footer>

            <Modal isOpen={modelModal.isOpen} onClose={() => setModelModal({ isOpen: false, model: null, period: null })} title={`Part-wise Claims for ${modelModal.model?.replace(/_/g, ' ')} (${modelModal.period})`}>
                {modelModal.isOpen && <ModelPartsChart model={modelModal.model} period={modelModal.period} />}
            </Modal>

            <Modal isOpen={notificationModalOpen} onClose={() => setNotificationModalOpen(false)} title="Notifications">
                <ul className="list-disc list-inside space-y-2">
                    <li>New comment on Claim #12347</li>
                    <li>Claim #12348 assigned to you</li>
                    <li>Claim #12349 marked as resolved</li>
                </ul>
            </Modal>

            <style jsx global>{`
                body { background-color: #f9f9f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .nav-link { @apply text-gray-700 font-medium px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors; }
                .nav-link.active { @apply bg-blue-600 text-white hover:bg-blue-700; }
                .btn-circle { @apply w-7 h-7 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-300; }
                .form-select-sm { @apply text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50; }
                .form-input-sm { @apply text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-2 py-1; }
                .legend-item { @apply flex items-center; }
                .legend-color { @apply w-3 h-3 rounded-full mr-2; }
                .plus-button { @apply w-6 h-6 rounded-full p-0 flex items-center justify-center border-none text-white bg-blue-500 text-lg font-bold cursor-pointer absolute pointer-events-auto transition-all hover:bg-blue-600 hover:scale-110 shadow-md; }
                .minimalist-card { @apply bg-white rounded-xl shadow-lg flex items-center p-6 w-full border-l-4; }
                .minimalist-card .icon-container { @apply text-3xl mr-6; }
                .minimalist-card .text-container h5 { @apply text-sm font-bold uppercase tracking-wider mb-1; }
                .minimalist-card .text-container p { @apply text-gray-600 text-base m-0; }
                .minimalist-card.info { border-color: #007bff; } .minimalist-card.info .icon-container, .minimalist-card.info h5 { color: #007bff; }
                .minimalist-card.success { border-color: #28a745; } .minimalist-card.success .icon-container, .minimalist-card.success h5 { color: #28a745; }
                .minimalist-card.danger { border-color: #dc3545; } .minimalist-card.danger .icon-container, .minimalist-card.danger h5 { color: #dc3545; }
                .activity-card .p-4 { padding: 1rem; }
                .border-blue-600 { border-color: #007bff; } .text-blue-600 { color: #007bff; }
                .border-green-500 { border-color: #28a745; }
                .border-red-500 { border-color: #dc3545; }
                .border-yellow-500 { border-color: #ffc107; }
                strong.text-primary { color: #007bff; }
                strong.text-success { color: #28a745; }
                strong.text-danger { color: #dc3545; }
            `}</style>
        </div>
    );
}
export default LandingPage;