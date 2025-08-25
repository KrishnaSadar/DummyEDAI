import React, { useState, useEffect, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  RadialLinearScale, 
  LineElement, 
  PointElement,
  Filler,
  DoughnutController,
  PolarAreaController
} from 'chart.js';
import { 
  Bar, 
  Pie, 
  Line, 
  Scatter, 
  Doughnut, 
  PolarArea,
  Radar
} from 'react-chartjs-2';
import './DataVisualization.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  LineElement,
  PointElement,
  Filler,
  DoughnutController,
  PolarAreaController
);

const DataVisualization = ({ data, columns, rows, chartConfig, isFromSQL = false }) => {
  const [selectedChartType, setSelectedChartType] = useState('auto');
  const [customChartType, setCustomChartType] = useState('bar');
  const [showChartOptions, setShowChartOptions] = useState(false);
  const [chartTitle, setChartTitle] = useState('');
  const [selectedColumns, setSelectedColumns] = useState({ x: '', y: '' });
  const [colorScheme, setColorScheme] = useState('default');

  // Available chart types
  const chartTypes = [
    { value: 'auto', label: '🤖 Auto-Detect', description: 'Smart chart selection' },
    { value: 'bar', label: '📊 Bar Chart', description: 'Compare categories' },
    { value: 'line', label: '📈 Line Chart', description: 'Show trends over time' },
    { value: 'pie', label: '🥧 Pie Chart', description: 'Show proportions' },
    { value: 'doughnut', label: '🍩 Doughnut', description: 'Modern pie chart' },
    { value: 'scatter', label: '🔵 Scatter Plot', description: 'Show correlations' },
    { value: 'radar', label: '🕷️ Radar Chart', description: 'Multi-dimensional data' },
    { value: 'polar', label: '⚫ Polar Area', description: 'Circular data display' }
  ];

  // Color schemes
  const colorSchemes = {
    default: ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#10b981', '#f97316', '#ec4899'],
    sunset: ['#f97316', '#f59e0b', '#eab308', '#fbbf24', '#fde047', '#fef3c7'],
    ocean: ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
    forest: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'],
    berry: ['#7c3aed', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff']
  };

  // Auto-detect chart type based on data
  const autoDetectChartType = useMemo(() => {
    if (!columns || !rows || rows.length === 0) return 'bar';
    
    const hasDateColumn = columns.some(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('month') ||
      col.toLowerCase().includes('year')
    );
    
    const hasNumericColumn = columns.some(col => {
      const colIndex = columns.indexOf(col);
      return rows.some(row => !isNaN(parseFloat(row[colIndex])));
    });
    
    const uniqueValues = columns.map(col => {
      const colIndex = columns.indexOf(col);
      return new Set(rows.map(row => row[colIndex])).size;
    });
    
    if (hasDateColumn && hasNumericColumn) return 'line';
    if (uniqueValues.some(count => count <= 10) && hasNumericColumn) return 'bar';
    if (uniqueValues.some(count => count <= 8) && hasNumericColumn) return 'pie';
    if (hasNumericColumn && uniqueValues.some(count => count > 10)) return 'scatter';
    
    return 'bar';
  }, [columns, rows]);

  // Process data for charts
  const processedData = useMemo(() => {
    if (!columns || !rows || rows.length === 0) return null;
    
    const chartType = selectedChartType === 'auto' ? autoDetectChartType : customChartType;
    
    // Auto-select columns if not manually selected
    let xCol = selectedColumns.x || columns[0];
    let yCol = selectedColumns.y || columns.find(col => {
      const colIndex = columns.indexOf(col);
      return rows.some(row => !isNaN(parseFloat(row[colIndex])));
    }) || columns[1];
    
    if (!yCol) yCol = columns[0];
    
    const xIndex = columns.indexOf(xCol);
    const yIndex = columns.indexOf(yCol);
    
    const labels = rows.map(row => String(row[xIndex] || ''));
    const dataValues = rows.map(row => {
      const val = row[yIndex];
      return isNaN(parseFloat(val)) ? 0 : parseFloat(val);
    });
    
    const colors = colorSchemes[colorScheme];
    
    switch (chartType) {
      case 'bar':
      case 'line':
        return {
          labels,
          datasets: [{
            label: yCol,
            data: dataValues,
            backgroundColor: chartType === 'bar' ? colors.map(color => `${color}80`) : 'transparent',
            borderColor: colors[0],
            borderWidth: 2,
            fill: chartType === 'line',
            tension: 0.4,
            pointBackgroundColor: colors[0],
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8
          }]
        };
        
      case 'pie':
      case 'doughnut':
        return {
          labels,
          datasets: [{
            data: dataValues,
            backgroundColor: colors.slice(0, Math.min(labels.length, colors.length)),
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 4
          }]
        };
        
      case 'scatter':
        return {
          datasets: [{
            label: `${xCol} vs ${yCol}`,
            data: labels.map((label, index) => ({
              x: parseFloat(label) || index,
              y: dataValues[index]
            })),
            backgroundColor: colors[0],
            borderColor: colors[0],
            pointRadius: 6,
            pointHoverRadius: 8
          }]
        };
        
      case 'radar':
        return {
          labels,
          datasets: [{
            label: yCol,
            data: dataValues,
            backgroundColor: `${colors[0]}20`,
            borderColor: colors[0],
            borderWidth: 2,
            pointBackgroundColor: colors[0],
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        };
        
      case 'polar':
        return {
          labels,
          datasets: [{
            data: dataValues,
            backgroundColor: colors.slice(0, Math.min(labels.length, colors.length)),
            borderColor: '#fff',
            borderWidth: 2
          }]
        };
        
      default:
        return null;
    }
  }, [columns, rows, selectedChartType, customChartType, selectedColumns, colorScheme, autoDetectChartType]);

  // Chart options
  const chartOptions = useMemo(() => {
    const chartType = selectedChartType === 'auto' ? autoDetectChartType : customChartType;
    const title = chartTitle || `Data Visualization - ${chartType.toUpperCase()}`;
    
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: '#ffffff',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#ffffff',
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true
        }
      }
    };
    
    if (chartType === 'line' || chartType === 'bar') {
      baseOptions.scales = {
        y: {
          beginAtZero: true,
          grid: { 
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: { 
            color: 'rgba(255, 255, 255, 0.7)',
            font: { size: 12 }
          }
        },
        x: {
          grid: { 
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: { 
            color: 'rgba(255, 255, 255, 0.7)',
            font: { size: 12 }
          }
        }
      };
    }
    
    if (chartType === 'radar') {
      baseOptions.scales = {
        r: {
          beginAtZero: true,
          grid: { 
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: { 
            color: 'rgba(255, 255, 255, 0.7)',
            backdropColor: 'transparent'
          },
          pointLabels: {
            color: 'rgba(255, 255, 255, 0.8)',
            font: { size: 12 }
          }
        }
      };
    }
    
    return baseOptions;
  }, [selectedChartType, customChartType, chartTitle, autoDetectChartType]);

  // Render chart based on type
  const renderChart = () => {
    if (!processedData) return null;
    
    const chartType = selectedChartType === 'auto' ? autoDetectChartType : customChartType;
    
    const chartProps = {
      data: processedData,
      options: chartOptions,
      height: 400
    };
    
    switch (chartType) {
      case 'bar':
        return <Bar {...chartProps} />;
      case 'line':
        return <Line {...chartProps} />;
      case 'pie':
        return <Pie {...chartProps} />;
      case 'doughnut':
        return <Doughnut {...chartProps} />;
      case 'scatter':
        return <Scatter {...chartProps} />;
      case 'radar':
        return <Radar {...chartProps} />;
      case 'polar':
        return <PolarArea {...chartProps} />;
      default:
        return <div>Unsupported chart type.</div>;
    }
  };

  // Export chart as image
  const exportChart = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `chart_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Handle column selection change
  const handleColumnChange = (axis, value) => {
    setSelectedColumns(prev => ({ ...prev, [axis]: value }));
  };

  // Reset to auto-detection
  const resetToAuto = () => {
    setSelectedChartType('auto');
    setCustomChartType('auto');
    setChartTitle('');
    setSelectedColumns({ x: '', y: '' });
    setColorScheme('default');
  };

  // If no data, show placeholder
  if (!data && !columns && !rows) {
    return (
      <div className="data-viz-placeholder">
        <div className="placeholder-icon">📊</div>
        <h3>Data Visualization</h3>
        <p>Execute a query to see beautiful charts and graphs</p>
      </div>
    );
  }

  return (
    <div className="data-visualization">
      {/* Header */}
      <div className="viz-header">
        <div className="viz-title">
          <h3>📊 Data Visualization</h3>
          <p>Beautiful charts for your data insights</p>
        </div>
        
        <div className="viz-actions">
          <button 
            onClick={() => setShowChartOptions(!showChartOptions)}
            className="options-btn"
          >
            {showChartOptions ? '⚙️ Hide Options' : '⚙️ Chart Options'}
          </button>
          
          <button 
            onClick={exportChart}
            className="export-btn"
            disabled={!processedData}
          >
            📥 Export Chart
          </button>
        </div>
      </div>

      {/* Chart Options Panel */}
      {showChartOptions && (
        <div className="chart-options-panel">
          <div className="options-grid">
            {/* Chart Type Selection */}
            <div className="option-group">
              <label>Chart Type:</label>
              <div className="chart-type-grid">
                {chartTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedChartType(type.value);
                      if (type.value !== 'auto') {
                        setCustomChartType(type.value);
                      }
                    }}
                    className={`chart-type-btn ${selectedChartType === type.value ? 'active' : ''}`}
                    title={type.description}
                  >
                    <span className="chart-type-icon">{type.label.split(' ')[0]}</span>
                    <span className="chart-type-label">{type.label.split(' ').slice(1).join(' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Column Selection */}
            {columns && (
              <div className="option-group">
                <label>Data Mapping:</label>
                <div className="column-selection">
                  <div className="column-input">
                    <span>X-Axis:</span>
                    <select 
                      value={selectedColumns.x} 
                      onChange={(e) => handleColumnChange('x', e.target.value)}
                    >
                      <option value="">Auto-select</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="column-input">
                    <span>Y-Axis:</span>
                    <select 
                      value={selectedColumns.y} 
                      onChange={(e) => handleColumnChange('y', e.target.value)}
                    >
                      <option value="">Auto-select</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Customization */}
            <div className="option-group">
              <label>Customization:</label>
              <div className="customization-options">
                <div className="input-group">
                  <span>Title:</span>
                  <input
                    type="text"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                    placeholder="Enter chart title..."
                    className="title-input"
                  />
                </div>
                
                <div className="input-group">
                  <span>Color Scheme:</span>
                  <select 
                    value={colorScheme} 
                    onChange={(e) => setColorScheme(e.target.value)}
                    className="color-select"
                  >
                    {Object.keys(colorSchemes).map(scheme => (
                      <option key={scheme} value={scheme}>
                        {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="option-group">
              <button onClick={resetToAuto} className="reset-btn">
                🔄 Reset to Auto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Display */}
      <div className="chart-container">
        {processedData ? (
          <div className="chart-wrapper">
            {renderChart()}
          </div>
        ) : (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
            <p>Processing data for visualization...</p>
          </div>
        )}
      </div>

      {/* Data Summary */}
      {processedData && (
        <div className="data-summary">
          <div className="summary-item">
            <span className="summary-label">Data Points:</span>
            <span className="summary-value">{processedData.labels?.length || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Chart Type:</span>
            <span className="summary-value">
              {selectedChartType === 'auto' ? `${autoDetectChartType} (Auto)` : customChartType}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Source:</span>
            <span className="summary-value">
              {isFromSQL ? 'SQL Compiler' : 'Chat Query'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization;
