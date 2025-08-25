import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import config from '../../config';

/* ----------------- Small SVG X icon ----------------- */
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CURRENT_DATE = new Date();
const ALL_MODELS = '__ALL__';

/* ----------------- Color generator (stable across models) ----------------- */
const generateColorPalettes = (models) => {
  const actual = {};
  const predicted = {};
  models.forEach((model, index) => {
    const hue = (index * 45) % 360;
    actual[model] = `hsl(${hue}, 70%, 45%)`;
    predicted[model] = `hsl(${hue}, 70%, 65%)`;
  });
  return { actualColors: actual, predictedColors: predicted };
};

/* ----------------- Utils ----------------- */
const toISO = (d) => {
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return dd.toISOString().split('T')[0];
};
const monthKey = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short' });

/* ----------------- Data processing: returns chart rows + bucket→parts ----------------- */
/**
 * @returns {
 *   chartData: Array<{
 *     name: string,
 *     bucketKey: string,
 *     isFuture: boolean,
 *     <model_actual>, <model_predicted>
 *   }>,
 *   bucketPartsData: { [bucketKey: string]: { [modelName: string]: {actual_parts:obj, predicted_parts:obj} } }
 * }
 */
const processTimeSeriesData = (raw, period, modelNames) => {
  if (!raw || modelNames.length === 0) return { chartData: [], bucketPartsData: {} };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build all time buckets for X-axis
  const buckets = [];
  if (period === 'WTD') {
    // Start of current week (Sun)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - startOfWeek.getDay());
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      buckets.push({
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        bucketKey: toISO(day), // daily ISO
        dateObj: day,
      });
    }
  } else if (period === 'MTD') {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(today.getFullYear(), today.getMonth(), i);
      buckets.push({ label: String(i), bucketKey: toISO(day), dateObj: day });
    }
  } else { // YTD
    for (let m = 0; m < 12; m++) {
      const day = new Date(today.getFullYear(), m, 1);
      buckets.push({
        label: day.toLocaleDateString('en-US', { month: 'short' }),
        bucketKey: monthKey(day), // e.g., "Jan"
        dateObj: day
      });
    }
  }

  // Aggregations
  const totalsByBucket = {}; // bucketKey -> model -> { total_actual_claims, total_predicted_claims }
  const bucketPartsData = {}; // bucketKey -> model -> { actual_parts, predicted_parts }

  // Iterate raw data (YYYY-MM-DD -> models)
  Object.keys(raw).forEach((dateStr) => {
    const entryDate = new Date(dateStr);
    entryDate.setHours(0, 0, 0, 0);

    const keyForTotals = (period === 'YTD') ? monthKey(entryDate) : toISO(entryDate);

    // Only care about buckets present on the X axis (same month keys or daily keys)
    const bucketExists = buckets.some(b => b.bucketKey === keyForTotals);
    if (!bucketExists) return;

    if (!totalsByBucket[keyForTotals]) totalsByBucket[keyForTotals] = {};
    if (!bucketPartsData[keyForTotals]) bucketPartsData[keyForTotals] = {};

    const modelsForDate = raw[dateStr] || {};
    Object.keys(modelsForDate).forEach((model) => {
      const m = modelsForDate[model];

      // Totals
      if (!totalsByBucket[keyForTotals][model]) {
        totalsByBucket[keyForTotals][model] = { total_actual_claims: 0, total_predicted_claims: 0 };
      }
      totalsByBucket[keyForTotals][model].total_actual_claims += (m.total_actual_claims || 0);
      totalsByBucket[keyForTotals][model].total_predicted_claims += (m.total_predicted_claims || 0);

      // Parts store
      if (!bucketPartsData[keyForTotals][model]) {
        bucketPartsData[keyForTotals][model] = { actual_parts: {}, predicted_parts: {} };
      }

      // Only include ACTUAL parts if entryDate <= today
      if (entryDate <= today) {
        Object.entries(m.actual_parts || {}).forEach(([part, count]) => {
          bucketPartsData[keyForTotals][model].actual_parts[part] =
            (bucketPartsData[keyForTotals][model].actual_parts[part] || 0) + (count || 0);
        });
      }

      // Always include PREDICTED parts
      Object.entries(m.predicted_parts || {}).forEach(([part, count]) => {
        bucketPartsData[keyForTotals][model].predicted_parts[part] =
          (bucketPartsData[keyForTotals][model].predicted_parts[part] || 0) + (count || 0);
      });
    });
  });

  // Build chart rows aligned to buckets (+ mark future buckets explicitly)
  const chartData = buckets.map(({ label, bucketKey, dateObj }) => {
    const row = { name: label, bucketKey, isFuture: false };
    const models = totalsByBucket[bucketKey] || {};

    modelNames.forEach((model) => {
      const actualKey = `${model}_actual`;
      const predictedKey = `${model}_predicted`;
      const totals = models[model] || null;

      if (period === 'YTD') {
        const nowMonthIndex = today.getMonth();
        const rowMonthIndex = dateObj.getMonth(); // buckets are constructed with current year
        const isFutureMonth = rowMonthIndex > nowMonthIndex;
        if (isFutureMonth) row.isFuture = true;
        row[actualKey] = isFutureMonth ? 0 : (totals?.total_actual_claims || 0);
        row[predictedKey] = totals?.total_predicted_claims || 0;
      } else {
        const isFutureDay = new Date(dateObj) > today;
        if (isFutureDay) row.isFuture = true;
        row[actualKey] = isFutureDay ? 0 : (totals?.total_actual_claims || 0);
        row[predictedKey] = totals?.total_predicted_claims || 0;
      }
    });

    return row;
  });

  return { chartData, bucketPartsData };
};

/* ----------------- Tooltips ----------------- */
const TimeSeriesTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
      <p className="font-bold text-gray-800">{label}</p>
      {payload.map((pld, i) => (
        <div key={i} style={{ color: pld.fill }}>
          {`${pld.name}: ${Number(pld.value ?? 0).toLocaleString()}`}
        </div>
      ))}
      <div className="text-xs text-gray-500 mt-2">Click a bar to see part-wise details.</div>
    </div>
  );
};

/* ----------------- Modal showing parts for clicked bar ----------------- */
const PartsTable = ({ title, parts }) => {
  const rows = useMemo(() => {
    const arr = Object.entries(parts || {}).map(([name, count]) => ({ name, count: Number(count || 0) }));
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [parts]);

  if (!rows.length) return (
    <div className="text-sm text-gray-500 italic p-3">No data</div>
  );

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 bg-gray-100 text-sm font-semibold">{title}</div>
      <div className="max-h-64 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 border-b">Part</th>
              <th className="text-right px-3 py-2 border-b">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                <td className="px-3 py-1.5">{r.name}</td>
                <td className="px-3 py-1.5 text-right font-medium">{r.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PartWiseClaimsModal = ({ open, onClose, header, modelName, actualParts, predictedParts }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* dialog */}
      <div className="relative bg-white w-[95%] max-w-4xl rounded-2xl shadow-xl border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500">{header}</div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">
              {modelName.replace(/_/g, ' ')} — Parts Breakdown
            </h3>
          </div>
          <button onClick={onClose}
                  className="p-2 rounded-md hover:bg-gray-100 active:scale-95 transition" aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <PartsTable title="Actual Parts (till today)" parts={actualParts} />
          <PartsTable title="Predicted Parts" parts={predictedParts} />
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Note: Actuals include data up to today only. Future dates/months will not show actual parts.
        </div>
      </div>
    </div>
  );
};

/* ----------------- Main Component ----------------- */
const MazdaClaimsDashboard = () => {
  const [dailyClaimsData, setDailyClaimsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPeriod, setSelectedPeriod] = useState('YTD'); // YTD | MTD | WTD
  const [selectedModel, setSelectedModel] = useState(ALL_MODELS);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHeader, setModalHeader] = useState('');
  const [modalModel, setModalModel] = useState('');
  const [modalActual, setModalActual] = useState({});
  const [modalPredicted, setModalPredicted] = useState({});

  // Fetch API (expects { success, data: { 'YYYY-MM-DD': { MODEL: {...} } } })
  useEffect(() => {
    fetch(`${config.API_BASE_URL}/forecast-claims/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('API error'))))
      .then((json) => {
        const dataObj = json?.data || json?.Data || json?.result || {};
        setDailyClaimsData(dataObj);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
  }, []);

  // All distinct model names present
  const allModelNames = useMemo(() => {
    if (!dailyClaimsData) return [];
    const s = new Set();
    Object.values(dailyClaimsData).forEach((dateEntry) => {
      Object.keys(dateEntry || {}).forEach((m) => s.add(m));
    });
    return Array.from(s).sort();
  }, [dailyClaimsData]);

  // Keep selection sane if data changes
  useEffect(() => {
    if (selectedModel !== ALL_MODELS && !allModelNames.includes(selectedModel)) {
      setSelectedModel(ALL_MODELS);
    }
  }, [allModelNames, selectedModel]);

  const displayedModels = useMemo(
    () => (selectedModel === ALL_MODELS ? allModelNames : [selectedModel]),
    [selectedModel, allModelNames]
  );

  // Colors stay stable for all models
  const { actualColors, predictedColors } = useMemo(
    () => generateColorPalettes(allModelNames),
    [allModelNames]
  );

  const { chartData, bucketPartsData } = useMemo(
    () => processTimeSeriesData(dailyClaimsData, selectedPeriod, displayedModels),
    [dailyClaimsData, selectedPeriod, displayedModels]
  );

  // Label for title
  const periodLabels = {
    YTD: `Yearly model wise Claims Distribution (${CURRENT_DATE.getFullYear()})`,
    MTD: `Monthly model wise Claims Distribution (${CURRENT_DATE.toLocaleDateString('en-US', { month: 'long' })})`,
    WTD: 'Weekly model wise Claims Distribution',
  };
  const chartTitle = periodLabels[selectedPeriod];

  // CLICK HANDLER: receives Recharts point + our model/series context
  const handleBarClick = (entry, modelName, series) => {
    if (!entry || !entry.payload) return;

    const { bucketKey, name, isFuture } = entry.payload;
    const bucket = bucketPartsData?.[bucketKey] || {};
    const partsOfModel = bucket?.[modelName] || { actual_parts: {}, predicted_parts: {} };

    // ✅ If this bucket is in the future (e.g., YTD months after current month), hide actual parts.
    const actualPartsForModal = isFuture ? {} : (partsOfModel.actual_parts || {});
    const predictedPartsForModal = partsOfModel.predicted_parts || {};

    setModalHeader(`${selectedPeriod} • ${name} • ${series === 'actual' ? 'Actual' : 'Predicted'}`);
    setModalModel(modelName);
    setModalActual(actualPartsForModal);
    setModalPredicted(predictedPartsForModal);
    setModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-lg">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  if (!dailyClaimsData) return <div className="p-8 text-center text-lg">No data available.</div>;

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-lg border border-gray-200 font-sans">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{chartTitle}</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg py-2 px-4"
            aria-label="Select period"
          >
            <option value="YTD">YTD</option>
            <option value="MTD">MTD</option>
            <option value="WTD">WTD</option>
          </select>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg py-2 px-4"
            aria-label="Select model"
          >
            <option value={ALL_MODELS}>All Models</option>
            {allModelNames.map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[560px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<TimeSeriesTooltip />} />
            <Legend />
            {displayedModels.map((model) => (
              <React.Fragment key={model}>
                <Bar
                  dataKey={`${model}_actual`}
                  name={`${model.replace(/_/g, ' ')} Actual`}
                  fill={actualColors[model]}
                  stackId="actual"
                  onClick={(entry) => handleBarClick(entry, model, 'actual')}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey={`${model}_predicted`}
                  name={`${model.replace(/_/g, ' ')} Predicted`}
                  fill={predictedColors[model]}
                  stackId="predicted"
                  onClick={(entry) => handleBarClick(entry, model, 'predicted')}
                  className="cursor-pointer"
                />
              </React.Fragment>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Modal */}
      <PartWiseClaimsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        header={modalHeader}
        modelName={modalModel}
        actualParts={modalActual}
        predictedParts={modalPredicted}
      />
    </div>
  );
};

export default MazdaClaimsDashboard;
