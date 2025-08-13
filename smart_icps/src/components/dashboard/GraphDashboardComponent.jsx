import React, { useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import Chart from 'chart.js/auto';
import { Grid } from 'gridjs';



// Import CSS for npm packages
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import 'gridjs/dist/theme/mermaid.css';
import CreateGraphModal from './CreateGraphModal';

const ResponsiveGridLayout = WidthProvider(Responsive);



const LOCAL_STORAGE_KEY_WIDGETS = 'dashboard_widgets';
const LOCAL_STORAGE_KEY_LAYOUT = 'dashboard_layout';
// --- ChartView Component ---
// This component is responsible for rendering the Chart.js canvas.
const ChartView = ({ config }) => {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            // Destroy the previous chart instance before creating a new one to prevent memory leaks.
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
            const ctx = canvasRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, config);
        }

        // Cleanup function to destroy the chart when the component unmounts.
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [config]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }}></canvas>;
};


const TableView = ({ config }) => {
    const wrapperRef = useRef(null);
    const gridInstanceRef = useRef(null);

    useEffect(() => {
        if (wrapperRef.current && config.data) {
            if (gridInstanceRef.current) {
                gridInstanceRef.current.destroy();
            }
            wrapperRef.current.innerHTML = '';

            const data = config.data.datasets[0].data.map((val, index) => [
                config.data.labels[index],
                val,
            ]);

            const grid = new Grid({
                columns: ['Model', config.data.datasets[0].label || 'Value'],
                data: data,
                search: true,
                sort: true,
                // Removed pagination
            });

            grid.render(wrapperRef.current);
            gridInstanceRef.current = grid;
        }
    }, [config]);

    return (
        <div
            ref={wrapperRef}
            style={{ maxHeight: '400px', overflowY: 'auto' }} // Enables vertical scroll
        />
    );
};

// --- Widget Component ---
// This component represents a single draggable and resizable widget on the dashboard.
const Widget = ({ id, title, chartConfig, onRemove }) => {
    const [view, setView] = useState('chart'); // Can be 'chart' or 'table'

    return (
        <div className="bg-white h-full w-full rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden">
            {/* Header with drag handle, title, and controls */}
            <div className="widget-header bg-gray-50 p-2 border-b border-gray-200 cursor-move flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-gray-700 text-sm truncate ml-2">{title}</h3>
                <div className="flex items-center space-x-2">
                    <select
                        value={view}
                        onChange={(e) => setView(e.target.value)}
                        className="view-selector bg-gray-200 border border-gray-300 text-gray-700 text-xs rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1"
                        onClick={(e) => e.stopPropagation()} // Prevent drag from starting on select click
                    >
                        <option value="chart">Chart</option>
                        <option value="table">Table</option>
                    </select>
                    <button onClick={() => {console.log("clicking");onRemove(id)}} className="text-gray-500 hover:text-red-600 text-xl font-bold px-2">&times;</button>
                </div>
            </div>
            {/* Body that renders either the chart or the table */}
            <div className="widget-body flex-grow p-4 overflow-auto">
                {view === 'chart' ? <ChartView config={chartConfig} /> : <TableView config={chartConfig} />}
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---

const GraphDashboardComponent = () => {
    const [widgets, setWidgets] = useState([]);
    const [layout, setLayout] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const savedWidgets = localStorage.getItem(LOCAL_STORAGE_KEY_WIDGETS);
        const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY_LAYOUT);
        if (savedWidgets) setWidgets(JSON.parse(savedWidgets));
        if (savedLayout) setLayout(JSON.parse(savedLayout));
        console.log(savedWidgets, savedLayout);
        setLoaded(true);
    }, []);

    // Save only after load
    useEffect(() => {
        if (loaded) {
            localStorage.setItem(LOCAL_STORAGE_KEY_WIDGETS, JSON.stringify(widgets));
        }
    }, [widgets]);

    useEffect(() => {
        if (loaded) {
            localStorage.setItem(LOCAL_STORAGE_KEY_LAYOUT, JSON.stringify(layout));
        }
    }, [layout]);


    const handleRemoveWidget = (widgetId) => {
        console.log("removing widgetId",widgetId)
        setWidgets(widgets.filter(w => w.id !== widgetId));
        setLayout(layout.filter(l => l.i !== widgetId));
    };

    return (
        <div className="bg-gray-100 p-4 min-h-screen">
            <CreateGraphModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                widgets={widgets}
                setWidgets={setWidgets}
                layout={layout}
                setLayout={setLayout}
            />
            <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">AI base customized graph generation</h1>
                    <p className="text-gray-600">This dashboard contains draggable and resizable widgets.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Create Graph
                </button>
            </div>
            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                draggableHandle=".widget-header"
                onLayoutChange={(newLayout) => setLayout(newLayout)}
            >
                {widgets.map(widget => (
                    <div key={widget.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <Widget
                            id={widget.id}
                            title={widget.title}
                            chartConfig={widget.config}
                            onRemove={handleRemoveWidget}
                        />
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};


export default GraphDashboardComponent;
