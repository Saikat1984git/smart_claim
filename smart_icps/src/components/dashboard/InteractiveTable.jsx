import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Search, Filter, X, LoaderCircle, AlertTriangle } from 'lucide-react';

// Reusable Status Badge Component
const StatusBadge = ({ status }) => {
    const statusStyles = {
        Approved: 'bg-green-100 text-green-800',
        Pending: 'bg-yellow-100 text-yellow-800',
        Rejected: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};

// Main Interactive Table Component
const InteractiveTable = () => {
    const [claimsData, setClaimsData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'repair_date', direction: 'descending' });
    const [activeFilters, setActiveFilters] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Fetch data from the API on component mount
    useEffect(() => {
        const fetchClaims = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch("http://127.0.0.1:8000/last-month-claims/");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log("Fetched claims data:", data);
                // Add a unique ID to each row for React keys
                const dataWithIds = data.data.map((item, index) => ({ ...item, id: item.vincd + '-' + index }));
                setClaimsData(dataWithIds);
            } catch (e) {
                setError(e.message);
                console.error("Failed to fetch claims data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClaims();
    }, []);

    const allStatuses = useMemo(() => [...new Set(claimsData.map(item => item.status))], [claimsData]);

    // Memoized calculation for filtered and sorted data
    const processedData = useMemo(() => {
        let sortableItems = [...claimsData];

        // Apply search filter
        if (searchTerm) {
            sortableItems = sortableItems.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Apply status filters
        if (activeFilters.length > 0) {
            sortableItems = sortableItems.filter(item => activeFilters.includes(item.status));
        }

        // Apply sorting
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                // To sort DD-MM-YYYY, we need to convert it to a comparable format like YYYY-MM-DD
                const reformatDate = (dateStr) => {
                    if (typeof dateStr !== 'string' || dateStr.length !== 10) return '';
                    const parts = dateStr.split('-');
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                };

                const dateA = reformatDate(a[sortConfig.key]);
                const dateB = reformatDate(b[sortConfig.key]);

                if (dateA < dateB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (dateA > dateB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return sortableItems;
    }, [claimsData, searchTerm, sortConfig, activeFilters]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterChange = (status) => {
        setActiveFilters(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <ChevronUp className="h-4 w-4 text-gray-400 opacity-50" />;
        }
        return sortConfig.direction === 'ascending'
            ? <ChevronUp className="h-4 w-4 text-white" />
            : <ChevronDown className="h-4 w-4 text-white" />;
    };

    const headers = [
        { key: 'vincd', label: 'VIN' },
        { key: 'model', label: 'Model' },
        { key: 'claimAmount', label: 'Claim Amount' },
        { key: 'status', label: 'Status' },
        { key: 'repair_date', label: 'Repair Date' },
    ];

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-gray-500 py-20">
                    <LoaderCircle className="w-12 h-12 mb-4 animate-spin text-indigo-500" />
                    <h3 className="text-xl font-semibold">Loading Claims...</h3>
                    <p className="mt-1">Please wait a moment.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center text-red-500 py-20 bg-red-50 rounded-b-lg">
                    <AlertTriangle className="w-12 h-12 mb-4" />
                    <h3 className="text-xl font-semibold">Failed to Load Data</h3>
                    <p className="mt-1">Could not fetch claims. Please try again later.</p>
                    <p className="mt-2 text-xs text-red-400">Error: {error}</p>
                </div>
            );
        }

        return (
            <>
                <div className="overflow-auto h-[70vh] border-b border-gray-200">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 sticky top-0 z-10">
                            <tr>
                                {headers.map(header => (
                                    <th key={header.key} className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">
                                        <div
                                            className="flex items-center space-x-1 cursor-pointer select-none"
                                            onClick={() => requestSort(header.key)}
                                        >
                                            <span>{header.label}</span>
                                            {getSortIcon(header.key)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <motion.tbody layout>
                            <AnimatePresence>
                                {processedData.length > 0 ? (
                                    processedData.map((item) => (
                                        <motion.tr
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-b border-gray-200 even:bg-gray-50 odd:bg-white hover:bg-indigo-50 transition-colors duration-200"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-mono text-xs">{item.vincd}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.model}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">${parseFloat(item.claimAmount).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={item.status} />
                                            </td>
                                            {/* MODIFIED: Displaying date directly as it is already in the correct format */}
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.repair_date || 'N/A'}</td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <motion.tr layout>
                                        <td colSpan={headers.length} className="text-center py-12 bg-white">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <Search className="w-12 h-12 mb-4 text-gray-300" />
                                                <h3 className="text-xl font-semibold">No Results Found</h3>
                                                <p className="mt-1">Try adjusting your search or filters.</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )}
                            </AnimatePresence>
                        </motion.tbody>
                    </table>
                </div>

                <div className="p-4 flex justify-start items-center bg-gray-50 rounded-b-lg">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{processedData.length}</span> results.
                    </p>
                </div>
            </>
        );
    };

    return (
        <div className="w-full bg-gray-50 min-h-screen ">
            <div className="w-full mx-auto">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h1 className="text-2xl font-bold text-gray-800">Recent Claims</h1>
                        <p className="mt-1 text-gray-500">Claims submitted in the last month. Sorted by most recent.</p>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="p-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search VIN, model, amount..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            />
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition"
                            >
                                <Filter className="h-5 w-5 text-gray-500" />
                                <span className="font-medium text-gray-700">Filter</span>
                                {activeFilters.length > 0 && (
                                    <span className="bg-indigo-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                        {activeFilters.length}
                                    </span>
                                )}
                            </button>
                            <AnimatePresence>
                                {isFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-20 border border-gray-200"
                                    >
                                        <div className="p-4">
                                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Filter by Status</h4>
                                            {allStatuses.map(status => (
                                                <label key={status} className="flex items-center space-x-3 py-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={activeFilters.includes(status)}
                                                        onChange={() => handleFilterChange(status)}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-gray-700">{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="p-2 border-t border-gray-100">
                                            <button
                                                onClick={() => { setActiveFilters([]); }}
                                                className="w-full text-sm text-center text-indigo-600 hover:bg-indigo-50 rounded-md py-1"
                                            >
                                                Clear Filters
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Render Table, Loading, or Error State */}
                    {renderContent()}

                </div>
            </div>
        </div>
    );
};

export default InteractiveTable;