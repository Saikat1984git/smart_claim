import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Bot, X, CheckCircle2, XCircle } from 'lucide-react'; 

// Configuration for API endpoints
const API_BASE_URL = "http://127.0.0.1:8000"; // IMPORTANT: Replace with your actual API URL
const API_EXTRACT_URL = `${API_BASE_URL}/extract-warranty-claim`;
const API_PREDICT_URL = `${API_BASE_URL}/predict-from-json-dmy/`;

// Helper component for styled form cards
const FormCard = ({ title, icon, children, headerContent }) => (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center">
                <span className="text-blue-600 mr-3 text-xl"><i className={`fas ${icon}`}></i></span>
                <h5 className="text-lg font-semibold text-gray-700">{title}</h5>
            </div>
            {headerContent}
        </div>
        {children}
    </div>
);


// Helper component for the main loader/spinner
const Loader = ({ text }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50">
        <div className="relative flex justify-center items-center">
            <div className="absolute w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <i className="fas fa-robot text-blue-300 text-3xl"></i>
        </div>
        <p className="text-white mt-4 text-lg">{text}</p>
    </div>
);

// Helper component for the Prediction Modal
const PredictionModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const reasonCodeMap = new Map([
        ["ACP", "Warranty claim accepted."],
        ["PID", "Incorrect, ineligible, or improperly identified Part Number Main Cause (PNMC) or related part."],
        ["QTY", "Incorrect quantity or usage of PNMC or related part."],
        ["LOP", "Invalid or incorrect labor operation (LO)."],
        ["ATH", "Claim requires pre-authorization or submission authorization."],
        ["DSA", "Dealer Self-Authorization (DSA) error."],
        ["TML", "Claim, resubmission, or appeal submitted past the allowed deadline."],
        ["DUP", "Duplicate claim or repeat repair."],
        ["CMP", "Conflict with Campaign/Recall/SSP/Process Number requirements."],
        ["WEX", "General warranty coverage for the claimed repair has expired."],
        ["DCO", "Incorrect, missing, or improperly formatted data."],
        ["SUB", "Error in sublet claim."],
        ["BAT", "Battery claim non-compliance."],
        ["NPF", "No Problem Found (NPF) procedure violation."],
        ["BRV", "Claim on a branded title vehicle where warranty is void."],
        ["APL", "Appeal process error."],
        ["DOC", "Required documentation or claim text missing or incomplete."],
        ["TSB", "Non-compliance with Technical Service Bulletin (TSB) requirements."],
        ["PGM", "Vehicle programming/software issue."],
        ["FIN", "Financial error in claim total or amounts."],
        ["RNT", "Rental claim error."],
        ["MSC", "Miscellaneous policy violation or system error."]
    ]);

    // --- Data & Style Mapping ---
    const statusMap = { 'A': 'Accepted', 'R': 'Rejected' };
    const status = statusMap[data.warranty_status] || "N/A";
    const reason = reasonCodeMap.get(data.reason_code) || data.reason_code || "No reason provided.";
    const statusProb = (data.warranty_status_probability || 0) * 100;
    
    // Conditional classes for dynamic styling based on prediction status
    const isAccepted = status === 'Accepted';
    const baseColorClass = isAccepted ? 'green' : 'red';
    const headerIconColor = isAccepted ? 'text-green-600' : 'text-red-600';
    const statusConfidenceColor = isAccepted ? 'bg-green-600' : 'bg-red-600';
    const statusDisplayClass = isAccepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const reasonBorderClass = isAccepted ? 'border-l-green-500' : 'border-l-red-500';
    const getProbClass = (p) => p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    const StatusIcon = isAccepted ? CheckCircle2 : XCircle;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* --- Modal Header --- */}
                <header className="flex justify-between items-center p-4 border-b">
                    <div className="flex items-center space-x-3">
                        <Bot className={`h-7 w-7 ${headerIconColor}`} />
                        <h5 className="text-xl font-bold text-gray-800">AI Claim Prediction</h5>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </header>
                
                {/* --- Modal Body --- */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Predicted Status</label>
                            <div className={`flex items-center justify-center space-x-2 p-3 rounded-lg font-bold text-xl ${statusDisplayClass}`}>
                                <StatusIcon className="h-6 w-6" />
                                <span>{status}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status Confidence</label>
                            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full flex items-center ${statusConfidenceColor} justify-center text-white font-bold text-sm ${getProbClass(statusProb)} transition-all duration-500`} 
                                    style={{ width: `${statusProb.toFixed(1)}%` }}
                                >
                                    {statusProb.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- Reason Section --- */}
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Predicted Reason</label>
                         <div className={`bg-gray-50 p-4 rounded-lg border-l-4 ${reasonBorderClass}`}>
                            <h4 className="font-bold text-gray-800 mb-1">
                                {data.reason_code ? `Reason Code: ${data.reason_code}` : 'No Code Provided'}
                            </h4>
                            <p className="text-gray-700">{reason}</p>
                         </div>
                    </div>
                </div>
                
                {/* --- Modal Footer --- */}
                <footer className="p-4 bg-gray-50 rounded-b-2xl flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="bg-gray-600 text-white hover:bg-gray-700 font-bold py-2 px-6 rounded-lg transition-colors duration-200"
                    >
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

const WarrentySubmitPage = () => {
    const initialFormData = {
        ClaimNumber: '', RO_number: '', VIN: '', ModelName: '', PurchasingYear: '', MiledgeIn: '', MiledgeOut: '',
        RO_open_date: '', RepairDate: '', CustomerName: '', RO_Description: '',
        PNMC: '', PNMC_Quantity: '', WarrantyType_Code: '', SymptomCode: '', DamageCode: '',
        RelatedParts: '', RepairLocation: '',
        PartsUsed: [],
        LaborOpDetails: [],
        SubletAmount: '', SubletCode: '', EstimatedAmount: '', ServiceAdvisor: '',
        DealerCode: '', DealerName: '', DealerAddress: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileName, setFileName] = useState('Choose file...');
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [loaderText, setLoaderText] = useState('');
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [predictionData, setPredictionData] = useState(null);

    const validateForm = useCallback(() => {
        const newErrors = {};
        if (!formData.VIN) newErrors.VIN = "Please provide a VIN.";
        if (!formData.ModelName) newErrors.ModelName = "Please provide the model name.";
        if (!formData.CustomerName) newErrors.CustomerName = "Please provide the customer's name.";
        if (!formData.EstimatedAmount) newErrors.EstimatedAmount = "Please provide the estimated total amount.";

        if (formData.PartsUsed.length === 0) {
            newErrors.PartsUsed = "At least one part is required.";
        } else {
            formData.PartsUsed.forEach((part, index) => {
                if (!part.part_name || !part.part_quantity || !part.part_price) {
                    newErrors[`part_${index}`] = "All part fields are required.";
                }
            });
        }
        if (formData.LaborOpDetails.length === 0) {
            newErrors.LaborOpDetails = "At least one labor operation is required.";
        } else {
            formData.LaborOpDetails.forEach((op, index) => {
                if (!op.LaborOpCode || !op.LaborHours || !op.TechnicianID) {
                    newErrors[`labor_${index}`] = "All labor fields are required.";
                }
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setFileName(file.name);
        }
    };

    const handleDynamicChange = (index, event, type) => {
        const { name, value } = event.target;
        const list = [...formData[type]];
        list[index][name] = value;
        setFormData(prev => ({ ...prev, [type]: list }));
    };

    const addRow = (type) => {
        const emptyRow = type === 'PartsUsed'
            ? { part_name: '', part_quantity: '', part_price: '' }
            : { LaborOpCode: '', LaborHours: '', TechnicianID: '' };
        setFormData(prev => ({ ...prev, [type]: [...prev[type], emptyRow] }));
    };

    const removeRow = (index, type) => {
        const list = [...formData[type]];
        list.splice(index, 1);
        setFormData(prev => ({ ...prev, [type]: list }));
    };

    const showFeedback = (message, type = 'error') => {
        setFeedback({ message, type });
        if (type === 'success') {
            setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
        }
    };

    const handleReset = () => {
        setFormData(initialFormData);
        setSelectedFile(null);
        setFileName('Choose file...');
        setErrors({});
        setFeedback({ message: '', type: '' });
    };

    const handleExtract = async () => {
        if (!selectedFile) {
            showFeedback('Please select an image file to upload.');
            return;
        }
        setIsLoading(true);
        setLoaderText('Analyzing Document...');
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);

        try {
            const response = await axios.post(API_EXTRACT_URL, uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const extractedData = response.data;
            const formattedData = {
                ...initialFormData,
                ...extractedData,
                RelatedParts: Array.isArray(extractedData.RelatedParts) ? extractedData.RelatedParts.join(', ') : (extractedData.RelatedParts || ''),
                RepairLocation: Array.isArray(extractedData.RepairLocation) ? extractedData.RepairLocation.join(', ') : (extractedData.RepairLocation || ''),
                PartsUsed: extractedData.PartsUsed || [],
                LaborOpDetails: extractedData.LaborOpDetails || [],
            };
            setFormData(formattedData);
            showFeedback('AI successfully extracted data. Please review and submit.', 'success');
        } catch (error) {
            const errorMsg = error.response?.data?.detail || "Extraction failed. Please try again.";
            showFeedback(`Error: ${errorMsg}`);
        } finally {
            setIsLoading(false);
            setSelectedFile(null);
            setFileName('Choose file...');
        }
    };

    const formatDataForApi = () => {
        const data = { ...formData };

        ['MiledgeIn', 'MiledgeOut', 'PNMC_Quantity', 'PurchasingYear', 'EstimatedAmount', 'SubletAmount'].forEach(key => {
            data[key] = data[key] ? parseFloat(data[key]) : null;
        });

        data.RelatedParts = data.RelatedParts ? String(data.RelatedParts).split(',').map(s => s.trim()).filter(Boolean) : [];
        data.RepairLocation = data.RepairLocation ? String(data.RepairLocation).split(',').map(s => s.trim()).filter(Boolean) : [];

        data.PartsUsed = data.PartsUsed.map(p => ({
            ...p,
            part_quantity: parseInt(p.part_quantity, 10) || 0,
            part_price: parseFloat(p.part_price) || 0
        }));
        data.LaborOpDetails = data.LaborOpDetails.map(l => ({
            ...l,
            LaborHours: parseFloat(l.LaborHours) || 0
        }));

        return data;
    }

    const handlePredict = async () => {
        if (!validateForm()) {
            showFeedback('Please fill all mandatory fields (*).');
            return;
        }
        setIsLoading(true);
        setLoaderText('Predicting Status...');
        const apiData = formatDataForApi();

        try {
            const response = await axios.post(API_PREDICT_URL, apiData, {
                headers: { 'Content-Type': 'application/json' }
            });
            setPredictionData(response.data);
            setIsModalOpen(true);
        } catch (error) {
            const errorMsg = error.response?.data?.detail || "Prediction failed. Please try again.";
            showFeedback(`Prediction Error: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showFeedback('Please fill all mandatory fields (*).');
            return;
        }
        setIsLoading(true);
        setLoaderText('Submitting Claim...');
        // Simulate a final submission API call
        setTimeout(() => {
            setIsLoading(false);
            showFeedback('Claim submitted successfully (simulated)!', 'success');
            handleReset();
        }, 1500);
    };

    const getInputClass = (fieldName) => `w-full px-3 py-2 bg-gray-50 border ${errors[fieldName] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`;

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            {isLoading && <Loader text={loaderText} />}
            <PredictionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={predictionData} />


            <main className="container mx-auto p-4 md:p-8">
                <form onSubmit={handleSubmit} onReset={handleReset} noValidate>
                    {feedback.message && (
                        <div className={`p-4 mb-4 rounded-md ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                            {feedback.message}
                        </div>
                    )}

                    <FormCard title="AI Data Extraction" icon="fa-magic">
                        {/* AI Data Extraction fields... as before */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                            <div>
                                <label htmlFor="claimImageUpload" className="block text-sm font-medium text-gray-700">Upload Claim Document/Image</label>
                                <div className="mt-1 flex items-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                                    <div className="w-full text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="claimImageUpload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <span>Upload a file</span>
                                                <input id="claimImageUpload" name="claimImageUpload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                                            </label>
                                        </div>
                                        <p className="pl-1 text-xs text-gray-500">{fileName}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center lg:text-left">
                                <button type="button" onClick={handleExtract} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    <i className="fas fa-sync-alt mr-2"></i>
                                    Upload & Fill Form with <span className="font-bold ml-1">AI</span>
                                </button>
                            </div>
                        </div>
                    </FormCard>

                    <FormCard title="Claim & Vehicle Information" icon="fa-car-side">
                        {/* Claim & Vehicle Information fields... as before */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div><label className="block text-sm font-medium text-gray-700">Claim Number</label><input type="text" name="ClaimNumber" value={formData.ClaimNumber} onChange={handleInputChange} className={getInputClass('ClaimNumber')} placeholder="Enter Claim Number" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Repair Order Number</label><input type="text" name="RO_number" value={formData.RO_number} onChange={handleInputChange} className={getInputClass('RO_number')} placeholder="Enter R/O Number" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">VIN<span className="text-red-500">*</span></label><input type="text" name="VIN" value={formData.VIN} onChange={handleInputChange} className={getInputClass('VIN')} placeholder="Enter VIN" required /><p className="text-red-500 text-xs mt-1">{errors.VIN}</p></div>
                            <div className="grid grid-cols-2 gap-x-6">
                                <div><label className="block text-sm font-medium text-gray-700">Model Name<span className="text-red-500">*</span></label><input type="text" name="ModelName" value={formData.ModelName} onChange={handleInputChange} className={getInputClass('ModelName')} placeholder="e.g., CX-5" required /><p className="text-red-500 text-xs mt-1">{errors.ModelName}</p></div>
                                <div><label className="block text-sm font-medium text-gray-700">Purchasing Year</label><input type="number" name="PurchasingYear" value={formData.PurchasingYear} onChange={handleInputChange} className={getInputClass('PurchasingYear')} placeholder="e.g., 2023" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700">Mileage In</label><input type="number" name="MiledgeIn" value={formData.MiledgeIn} onChange={handleInputChange} className={getInputClass('MiledgeIn')} placeholder="e.g., 15000" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Mileage Out</label><input type="number" name="MiledgeOut" value={formData.MiledgeOut} onChange={handleInputChange} className={getInputClass('MiledgeOut')} placeholder="e.g., 15010" /></div>
                        </div>
                    </FormCard>

                    <FormCard title="Dates & Customer" icon="fa-user-clock">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div><label className="block text-sm font-medium text-gray-700">R/O Open Date</label><input type="date" name="RO_open_date" value={formData.RO_open_date} onChange={handleInputChange} className={getInputClass('RO_open_date')} /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Repair Date</label><input type="date" name="RepairDate" value={formData.RepairDate} onChange={handleInputChange} className={getInputClass('RepairDate')} /></div>
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Customer Name<span className="text-red-500">*</span></label><input type="text" name="CustomerName" value={formData.CustomerName} onChange={handleInputChange} className={getInputClass('CustomerName')} placeholder="Enter Customer Name" required /><p className="text-red-500 text-xs mt-1">{errors.CustomerName}</p></div>
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Customer Complaint / R/O Description</label><textarea name="RO_Description" value={formData.RO_Description} onChange={handleInputChange} className={getInputClass('RO_Description')} rows="3" placeholder="Describe the customer complaint..."></textarea></div>
                        </div>
                    </FormCard>

                    <FormCard title="Technical Details" icon="fa-microchip">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                            <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700">Part Number Mainly Concerned (PNMC)</label><input type="text" name="PNMC" value={formData.PNMC} onChange={handleInputChange} className={getInputClass('PNMC')} placeholder="Enter PNMC" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">PNMC Quantity</label><input type="number" name="PNMC_Quantity" value={formData.PNMC_Quantity} onChange={handleInputChange} className={getInputClass('PNMC_Quantity')} placeholder="e.g., 1" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Warranty Type Code</label><input type="text" name="WarrantyType_Code" value={formData.WarrantyType_Code} onChange={handleInputChange} className={getInputClass('WarrantyType_Code')} placeholder="e.g., W" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Symptom Code</label><input type="text" name="SymptomCode" value={formData.SymptomCode} onChange={handleInputChange} className={getInputClass('SymptomCode')} placeholder="e.g., S01" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Damage Code</label><input type="text" name="DamageCode" value={formData.DamageCode} onChange={handleInputChange} className={getInputClass('DamageCode')} placeholder="e.g., D01" /></div>
                            <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700">Related Parts (comma-separated codes)</label><input type="text" name="RelatedParts" value={formData.RelatedParts} onChange={handleInputChange} className={getInputClass('RelatedParts')} placeholder="e.g., PartCodeA, PartCodeB" /></div>
                            <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700">Repair Location(s) (comma-separated)</label><input type="text" name="RepairLocation" value={formData.RepairLocation} onChange={handleInputChange} className={getInputClass('RepairLocation')} placeholder="e.g., Passenger side, Front bumper" /></div>
                        </div>
                    </FormCard>

                    <FormCard title="Parts Used*" icon="fa-cogs"
                        headerContent={<button type="button" onClick={() => addRow('PartsUsed')} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-1 px-3 rounded-md text-sm"><i className="fas fa-plus mr-1"></i> Add Part</button>}>
                        {errors.PartsUsed && <p className="text-red-500 text-xs mt-1">{errors.PartsUsed}</p>}
                        <div className="overflow-x-auto mt-2">
                            <table className="min-w-full">
                                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price ($)</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th></tr></thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.PartsUsed.map((part, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="p-1"><input type="text" name="part_name" value={part.part_name} onChange={(e) => handleDynamicChange(index, e, 'PartsUsed')} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Part Name" required /></td>
                                            <td className="p-1"><input type="number" name="part_quantity" value={part.part_quantity} onChange={(e) => handleDynamicChange(index, e, 'PartsUsed')} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Qty" min="1" required /></td>
                                            <td className="p-1"><input type="number" name="part_price" value={part.part_price} onChange={(e) => handleDynamicChange(index, e, 'PartsUsed')} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Price" step="0.01" min="0" required /></td>
                                            <td className="p-1"><button type="button" onClick={() => removeRow(index, 'PartsUsed')} className="text-red-500 hover:text-red-700 p-2"><i className="fas fa-trash-alt"></i></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {Object.keys(errors).some(k => k.startsWith('part_')) && <p className="text-red-500 text-xs mt-1">Please fill all fields for all parts.</p>}
                        </div>
                    </FormCard>

                    <FormCard title="Labor Operations*" icon="fa-hard-hat"
                        headerContent={<button type="button" onClick={() => addRow('LaborOpDetails')} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-1 px-3 rounded-md text-sm"><i className="fas fa-plus mr-1"></i> Add Labor</button>}>
                        {errors.LaborOpDetails && <p className="text-red-500 text-xs mt-1">{errors.LaborOpDetails}</p>}
                        <div className="overflow-x-auto mt-2">
                            <table className="min-w-full">
                                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labor Op Code</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labor Hours</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician ID</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th></tr></thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.LaborOpDetails.map((op, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="p-1"><input type="text" name="LaborOpCode" value={op.LaborOpCode} onChange={(e) => handleDynamicChange(index, e, 'LaborOpDetails')} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Op Code" required /></td>
                                            <td className="p-1"><input type="number" name="LaborHours" value={op.LaborHours} onChange={(e) => handleDynamicChange(index, e, 'LaborOpDetails')} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Hours" step="0.1" min="0" required /></td>
                                            <td className="p-1"><input type="text" name="TechnicianID" value={op.TechnicianID} onChange={(e) => handleDynamicChange(index, e, 'LaborOpDetails')} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Tech ID" required /></td>
                                            <td className="p-1"><button type="button" onClick={() => removeRow(index, 'LaborOpDetails')} className="text-red-500 hover:text-red-700 p-2"><i className="fas fa-trash-alt"></i></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {Object.keys(errors).some(k => k.startsWith('labor_')) && <p className="text-red-500 text-xs mt-1">Please fill all fields for all labor operations.</p>}
                        </div>
                    </FormCard>

                    <FormCard title="Financials & Dealer Information" icon="fa-file-invoice-dollar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div><label className="block text-sm font-medium text-gray-700">Sublet Amount ($)</label><input type="number" name="SubletAmount" value={formData.SubletAmount} onChange={handleInputChange} className={getInputClass('SubletAmount')} placeholder="e.g., 50.00" step="0.01" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Sublet Code</label><input type="text" name="SubletCode" value={formData.SubletCode} onChange={handleInputChange} className={getInputClass('SubletCode')} placeholder="Enter Sublet Code" /></div>
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Estimated Total Amount ($)<span className="text-red-500">*</span></label><input type="number" name="EstimatedAmount" value={formData.EstimatedAmount} onChange={handleInputChange} className={getInputClass('EstimatedAmount')} placeholder="e.g., 450.50" required step="0.01" /><p className="text-red-500 text-xs mt-1">{errors.EstimatedAmount}</p></div>
                            <div><label className="block text-sm font-medium text-gray-700">Service Advisor</label><input type="text" name="ServiceAdvisor" value={formData.ServiceAdvisor} onChange={handleInputChange} className={getInputClass('ServiceAdvisor')} placeholder="Enter Service Advisor Name" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Dealer Code</label><input type="text" name="DealerCode" value={formData.DealerCode} onChange={handleInputChange} className={getInputClass('DealerCode')} placeholder="Enter Dealer Code" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Dealer Name</label><input type="text" name="DealerName" value={formData.DealerName} onChange={handleInputChange} className={getInputClass('DealerName')} placeholder="Enter Dealer Name" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Dealer Address</label><textarea name="DealerAddress" value={formData.DealerAddress} onChange={handleInputChange} className={getInputClass('DealerAddress')} rows="2" placeholder="Enter Dealer Address"></textarea></div>
                        </div>
                    </FormCard>

                    <div className="flex justify-end my-8 space-x-3">
                        <button type="reset" className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"><i className="fas fa-undo mr-1"></i> Reset Form</button>
                        <button type="button" onClick={handlePredict} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"><i className="fas fa-robot mr-1"></i> Predict Status</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"><i className="fas fa-paper-plane mr-1"></i> Submit Claim</button>
                    </div>
                </form>
            </main>

            <footer className="text-center py-4 bg-gray-200 mt-8">
                <p className="text-gray-600 text-sm">© {new Date().getFullYear()} YOUR COMPANY | ALL RIGHTS RESERVED</p>
            </footer>
        </div>
    );
}

export default WarrentySubmitPage;