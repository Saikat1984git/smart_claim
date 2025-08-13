import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import GraphLoader from '../common/GraphLoader';
import config from '../../config';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


// Helper function to create a vertical gradient for the chart's fill
const createGradient = (ctx, area, startColor, endColor) => {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  return gradient;
};

const dummyData = {
  2022: {
    total: [185, 193, 207, 195, 212, 228, 243, 234, 250, 272, 278, 292],
    accepted: [168, 176, 190, 177, 195, 210, 224, 215, 232, 248, 260, 270],
    rejected: [17, 17, 17, 18, 19, 18, 19, 21, 18, 24, 18, 22],
  },
  2023: {
    total: [218, 210, 238, 250, 259, 263, 277, 300, 308, 326, 329, 355],
    accepted: [198, 193, 217, 229, 238, 241, 255, 275, 285, 301, 298, 325],
    rejected: [20, 17, 21, 21, 21, 22, 22, 25, 23, 25, 31, 30],
  },
  2024: {
    total: [260, 270, 275, 285, 308, 297, 340, 358, 370, 385, 410, 428],
    accepted: [235, 245, 248, 260, 278, 265, 310, 325, 340, 350, 370, 385],
    rejected: [25, 25, 27, 25, 30, 32, 30, 33, 30, 36, 40, 43],
  },
  2025: {
    historical: {
      total: [268, 280, 273, 292, 312, 319, 348],
      accepted: [242, 253, 248, 263, 282, 289, 312],
      rejected: [26, 27, 25, 29, 30, 30, 36],
    },
    forecast: {
      total: [362, 379, 401, 428, 450],
      accepted: [328, 343, 360, 380, 405],
      rejected: [34, 38, 35, 41, 39],
    },
  },

};


const ClaimsTrendChart = ({ setYear }) => {
  const [selectedView, setSelectedView] = useState('2025');
  const [chartData, setChartData] = useState({ datasets: [] });
  const [yearTrendData, setYearTrendData] = useState(dummyData);
  const [error, setError] = useState(null);    // for handling errors
  const [loading, setLoading] = useState(false); // for loading state


  const labelsByYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labelsAiForecast = ['2026', '2027', '2028', '2029', '2030'];
  const years = [2022, 2023, 2024, 2025];

  useEffect(() => {
    let datasets;
    let labels;

    const createDataset = (label, data, color, dashed = false) => ({
      label,
      data,
      borderColor: color,
      backgroundColor: (context) => {
        const { chart } = context;
        const { ctx, chartArea } = chart;
        if (!chartArea) return null;
        const colorRGB = color.startsWith('#')
          ? `${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}`
          : '59, 130, 246';
        return createGradient(ctx, chartArea, `rgba(${colorRGB}, 0)`, `rgba(${colorRGB}, 0.2)`);
      },
      borderWidth: 2.5,
      borderDash: dashed ? [6, 6] : [],
      tension: 0.4,
      fill: true,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointHoverRadius: 8,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
    });

    if (selectedView === 'ai_forecast') {
      labels = labelsAiForecast;
      datasets = [
        createDataset('Total Claims', yearTrendData.aiForecast.total, '#3b82f6', true),
        createDataset('Accepted Claims', yearTrendData.aiForecast.accepted, '#10b981', true),
        createDataset('Rejected Claims', yearTrendData.aiForecast.rejected, '#ef4444', true),
      ];
    } else if (selectedView === '2025') {
      labels = labelsByYear;
      const historicalData = yearTrendData[2025].historical;
      const forecastData = yearTrendData[2025].forecast;
      const fullData = (type) => [
        ...historicalData[type],
        ...new Array(labelsByYear.length - historicalData[type].length).fill(null),
      ];
      const forecastLine = (type) => [
        ...new Array(historicalData[type].length - 1).fill(null),
        historicalData[type][historicalData[type].length - 1],
        ...forecastData[type],
      ];

      datasets = [
        createDataset('Total Claims', fullData('total'), '#3b82f6'),
        createDataset('Accepted Claims', fullData('accepted'), '#10b981'),
        createDataset('Rejected Claims', fullData('rejected'), '#ef4444'),
        createDataset('Total Forecast', forecastLine('total'), '#3b82f6', true),
        createDataset('Accepted Forecast', forecastLine('accepted'), '#10b981', true),
        createDataset('Rejected Forecast', forecastLine('rejected'), '#ef4444', true),
      ];
    } else {
      labels = labelsByYear;
      const yearData = yearTrendData[selectedView];
      datasets = [
        createDataset(`Total Claims ${selectedView}`, yearData.total, '#3b82f6'),
        createDataset(`Accepted Claims ${selectedView}`, yearData.accepted, '#10b981'),
        createDataset(`Rejected Claims ${selectedView}`, yearData.rejected, '#ef4444'),
      ];
    }

    setChartData({ labels, datasets });
  }, [selectedView, yearTrendData]);


  useEffect(() => {
    const fetchAllYears = async () => {
      setLoading(true);
      setError(null);
      const result = {};

      try {
        for (const year of years) {
          const response = await fetch(`${config.API_BASE_URL}/generate-claim-data/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ year }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to fetch year ${year}`);
          }

          const resJson = await response.json();

          // Custom logic for 2025 (forecast + historical)
          if (year === 2025) {
            result[year] = {
              historical: resJson.data.historical,
              forecast: resJson.data.forecast,
            };
          } else {
            result[year] = {
              total: resJson.data.total,
              accepted: resJson.data.accepted,
              rejected: resJson.data.rejected,
            };
          }
        }
        console.log("Fetched year data:", result);

        setYearTrendData(result);  // ✅ This updates your state with full data
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllYears();
  }, []);


  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4b5563',
          font: { size: 14, family: "'Inter', sans-serif" },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          generateLabels: (chart) => {
            const originalLabels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
            originalLabels.forEach((label) => {
              if (chart.getDatasetMeta(label.datasetIndex).hidden) {
                label.strokeStyle = '#9ca3af';
                label.fillStyle = '#9ca3af';
                label.text = `${label.text}`; // No strikethrough for default view
              }
            });
            return originalLabels;
          },
        },
        onClick: (e, legendItem, legend) => {
          const index = legendItem.datasetIndex;
          const ci = legend.chart;
          const meta = ci.getDatasetMeta(index);
          meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
          legendItem.hidden = meta.hidden;
          if (meta.hidden) {
            legendItem.text = ` ${legendItem.text}`;
          } else {
            legendItem.text = legendItem.text.trim();
          }

          // Toggle line-through style on the legend item's text
          const textElement = legend.legendItems[index].text;
          if (meta.hidden) {
            legend.chart.legend.options.labels.font.strikethrough = true;
          } else {
            legend.chart.legend.options.labels.font.strikethrough = false;
          }

          ci.update();
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: '#ffffff',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        caretSize: 8,
        cornerRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString();
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          drawOnChartArea: false,
          drawTicks: false,
        },
        ticks: { color: '#6b7280', padding: 10 },
        title: {
          display: true,
          text: selectedView === 'ai_forecast' ? 'Year' : 'Month',
          color: '#4b5563',
          font: {
            size: 14,
            family: "'Inter', sans-serif",
            weight: '600',
          },
        },
      },
      y: {
        grid: {
          color: '#f3f4f6',
          drawBorder: false,
        },
        ticks: { color: '#6b7280', padding: 10 },
        title: {
          display: true,
          text: 'Number of Claims',
          color: '#4b5563',
          font: {
            size: 14,
            family: "'Inter', sans-serif",
            weight: '600',
          },
        },
      },
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutSine',
    },
  };

  const getHeaderText = () => {
    if (selectedView === '2025') return '2025 (YTD & Forecast)';
    if (selectedView === 'ai_forecast') return 'AI Forecast (5-Year)';
    return selectedView;
  };

  return ( 
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6 w-full max-w-5xl transition-shadow hover:shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex items-baseline space-x-3 mb-3 sm:mb-0">
            <h3 className="text-lg font-semibold text-gray-800">
              Claims Trend Analysis
            </h3>
            <span className="text-sm font-medium text-gray-500">
              {getHeaderText()}
            </span>
          </div>
          <div className="relative group">
            <select
              id="year-select"
              value={selectedView}
              onChange={(e) => {
                setSelectedView(e.target.value);
                setYear(e.target.value);
              }}
              className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8 cursor-pointer group-hover:border-blue-400 transition"
            >
              {/* <option value="ai_forecast">AI Forecast</option> */}
              <option value="2025">2025 (YTD & Forecast)</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className="relative h-72 sm:h-96">
         { loading? <GraphLoader />:<Line data={chartData} options={options} />}
          
        </div>
      </div>
    )
  ;
};

export default ClaimsTrendChart;