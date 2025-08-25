import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale, LineElement, PointElement, Filler } from 'chart.js';
import { Bar, Pie, Line, Scatter, Doughnut, PolarArea, Radar } from 'react-chartjs-2';

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
  Filler
);

const ChartDisplay = ({ chartConfig }) => {
  if (!chartConfig || !chartConfig.type) {
    return (
      <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
        No chart data available for this query.
      </div>
    );
  }

  const renderChart = () => {
    switch (chartConfig.type) {
      case 'bar':
        return <Bar data={chartConfig.data} options={chartConfig.options} />;
      case 'line':
        return <Line data={chartConfig.data} options={chartConfig.options} />;
      case 'pie':
        return <Pie data={chartConfig.data} options={chartConfig.options} />;
      case 'doughnut':
        return <Doughnut data={chartConfig.data} options={chartConfig.options} />;
      case 'scatter':
        return <Scatter data={chartConfig.data} options={chartConfig.options} />;
      case 'radar':
        return <Radar data={chartConfig.data} options={chartConfig.options} />;
      case 'polar':
        return <PolarArea data={chartConfig.data} options={chartConfig.options} />;
      default:
        return <div>Unsupported chart type.</div>;
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '16px',
      position: 'relative',
      maxHeight: '400px',
      minHeight: '200px',
    }}>
      <h4 style={{ color: '#22c55e', marginBottom: '16px' }}>📊 Visualization: {chartConfig.title || 'Untitled Chart'}</h4>
      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartDisplay;