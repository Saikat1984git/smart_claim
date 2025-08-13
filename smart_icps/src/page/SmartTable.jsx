import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Send } from 'lucide-react';
import config from '../config';

// --- Reusable, Plug-and-Play Data Table Component ---
// This component is now self-contained and receives its data and functions via props.
const InteractiveDataTable = ({
    title,
    description,
    data,
    onQuerySubmit,
    isLoading,
    query,
    setQuery,
    inputPlaceholder
}) => {
    // State for the global filter/search term within the table
    const [filter, setFilter] = useState('');
    // State to manage sorting configuration
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // --- Event Handler for the Input Form ---
    const handleQuerySubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        onQuerySubmit(query);
    };

    // --- Sorting Logic ---
    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    // --- Filtering Logic ---
    const filteredData = useMemo(() => {
        if (!filter) {
            return sortedData;
        }
        return sortedData.filter(item =>
            Object.values(item).some(value =>
                String(value).toLowerCase().includes(filter.toLowerCase())
            )
        );
    }, [sortedData, filter]);

    // --- Function to request a sort on a column ---
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // --- Dynamic Headers ---
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

    // --- Render Helper for Sort Icons ---
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <span className="opacity-20">↑↓</span>;
        }
        if (sortConfig.direction === 'ascending') {
            return <ChevronUp className="inline-block ml-1 h-4 w-4" />;
        }
        return <ChevronDown className="inline-block ml-1 h-4 w-4" />;
    };

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
            {/* --- Data Table Section --- */}
            {data.length > 0 ? (
                <>
                    {/* --- Filter Input --- */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Filter results..."
                                className="w-full bg-gray-50 border border-gray-300 rounded-md p-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            />
                        </div>
                    </div>

                    {/* --- Table --- */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                <tr>
                                    {headers.map((header) => (
                                        <th key={header} scope="col" className="px-6 py-3">
                                            <div
                                                className="flex items-center cursor-pointer select-none group"
                                                onClick={() => requestSort(header)}
                                            >
                                                {header.replace(/_/g, ' ')}
                                                <span className="ml-2 text-gray-400 group-hover:text-gray-600 transition-colors">
                                                    {getSortIcon(header)}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((row, index) => (
                                    <tr key={row.VIN_CD || index} className="bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                                        {headers.map((header) => (
                                            <td key={`${row.VIN_CD}-${header}`} className="px-6 py-4">
                                                {String(row[header])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* --- No Results Message --- */}
                    {filteredData.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p className="text-lg">No results found for "{filter}"</p>
                            <p className="text-sm">Try adjusting your filter.</p>
                        </div>
                    )}
                </>
            ) : (
                /* --- Initial State / No Data Message --- */
                <div className="text-center py-20 px-4 text-gray-500">
                    <div className="inline-block bg-gray-100 p-5 rounded-full border border-gray-200 mb-4">
                        <Search className="h-10 w-10 text-gray-400" />
                    </div>
                    <h2 className="text-lg font-medium text-gray-700">No Data to Display</h2>
                    <p className="mt-1">Enter a query above to fetch and display data.</p>
                </div>
            )}
        </div>
    );
};


// --- Main App Component (Demonstration of how to use the component) ---
export default function SmartTable() {
    // State for the user's input query
    const [query, setQuery] = useState('');
    // State to hold the data from the API
    const [data, setData] = useState([]);
    // State to manage loading status
    const [isLoading, setIsLoading] = useState(false);

    // --- Mock Data ---
    const mockApiResponse = [
        { 'DISTBTR_CD': 'D102', 'DLR_CD': 50200, 'VIN_CD': 'JM3KFBAMXN00508231', 'STS_CD': 'P', 'CLM_EST_AM': 5087.89, 'WARR_TYPE_CD': 'P', 'RPR_DT': '2025-07-30 00:00:00', 'PART_CD': 'O2S-9F472,CLT-7563,INJ-9F593,WSH-03100', 'PNMC_FLAG': 'R', 'PART_AM': 6506.7, 'PART_QT': '5,7,1,7', 'LBR_HRS_QT': 4.82, 'LBR_COST': 660.53, 'SUBLET_CD': 'W1', 'SUBLET_AM': 456.29, 'CRLN_CD': 'M3S', 'RPR_ODO_QT': 46617 },
        { 'DISTBTR_CD': 'D101', 'DLR_CD': 20400, 'VIN_CD': 'JM3KFBAMXN07209199', 'STS_CD': 'P', 'CLM_EST_AM': 196.98, 'WARR_TYPE_CD': 'P', 'RPR_DT': '2025-07-30 00:00:00', 'PART_CD': 'RAD-8005', 'PNMC_FLAG': 'R', 'PART_AM': 621.5, 'PART_QT': '2', 'LBR_HRS_QT': 5.45, 'LBR_COST': 683.16, 'SUBLET_CD': 'O2', 'SUBLET_AM': 351.57, 'CRLN_CD': 'MZ5', 'RPR_ODO_QT': 84189 },
        { 'DISTBTR_CD': 'D101', 'DLR_CD': 20400, 'VIN_CD': 'JM3KFBAMXN01661861', 'STS_CD': 'P', 'CLM_EST_AM': 385.83, 'WARR_TYPE_CD': 'A', 'RPR_DT': '2025-07-30 00:00:00', 'PART_CD': 'INJ-9F593,HL-13008-L', 'PNMC_FLAG': 'R', 'PART_AM': 2090.0, 'PART_QT': '4,6', 'LBR_HRS_QT': 1.17, 'LBR_COST': 121.26, 'SUBLET_CD': 'F6', 'SUBLET_AM': 348.04, 'CRLN_CD': 'CX5', 'RPR_ODO_QT': 13697 },
    ];

    const handleApiSubmit = async (userQuery) => {
        console.log(`Sending query to API: "${userQuery}"`);
        setIsLoading(true);
        setData([]); // Clear previous data

        try {
            const response = await fetch(`${config.API_BASE_URL}/ai-smart-table/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt: userQuery })
            });

            if (!response.ok) {
                throw new Error("API Error");
            }

            const json = await response.json();

            // Assuming json.content is the table-compatible array
            setData(json.content);
        } catch (error) {
            console.error("Error fetching from API:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Event Handler for the Input Form ---
    const handleQuerySubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return; // Don't submit if query is empty
        handleApiSubmit(query);
    };

    return (
        <div className="bg-gray-100 text-gray-800 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-8xl mx-auto space-y-8">
                {/* --- Input Section --- */}
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">Data Query Interface</h1>
                    <p className="text-gray-600 mb-4">Enter your query to fetch and analyze warranty claim data.</p>
                    <form onSubmit={handleQuerySubmit} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., 'Show all claims for the last week'"
                            className="flex-grow bg-gray-50 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 placeholder-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-5 rounded-md flex items-center justify-center transition-all duration-300"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </button>
                    </form>
                </div>

                {/* --- Reusable Component Usage --- */}
                <InteractiveDataTable
                    data={data}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}
