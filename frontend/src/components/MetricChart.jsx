import { Line, Bar, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

export function LineChart({ data, title, color = 'rgb(59, 130, 246)', animated = true }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 2000,
      easing: 'easeInOutQuart',
      delay: (context) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 50;
        }
        return delay;
      },
    } : false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y.toFixed(2);
            return label;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'ctrl',
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        },
        limits: {
          x: { min: 'original', max: 'original' },
          y: { min: 'original', max: 'original' }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#6b7280',
          padding: 10,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return <Line data={chartData} options={options} />;
}

export function BarChart({ data, title, color = 'rgb(59, 130, 246)', animated = true }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.7)'),
        borderColor: color,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 1500,
      easing: 'easeOutBounce',
      delay: (context) => context.dataIndex * 100,
    } : false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        displayColors: false,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#6b7280',
          padding: 10,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}

export function AreaChart({ data, title, color = 'rgb(59, 130, 246)', animated = true }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.4)'),
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 2000,
      easing: 'easeInOutCubic',
    } : false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        displayColors: false,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#6b7280',
          padding: 10,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return <Line data={chartData} options={options} />;
}

export function DoughnutChart({ data, title, animated = true }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(168, 85, 247)',
        ],
        borderWidth: 3,
        hoverOffset: 15,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: 'easeInOutQuart',
    } : false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12,
            weight: '500',
          },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
}

export function RadarChart({ data, title, color = 'rgb(59, 130, 246)', animated = true }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 2000,
      easing: 'easeInOutQuart',
    } : false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
      },
    },
  };

  return <Radar data={chartData} options={options} />;
}

export function PolarChart({ data, title, animated = true }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(168, 85, 247, 0.6)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(168, 85, 247)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: 'easeInOutQuart',
    } : false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          color: '#374151',
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
        padding: {
          bottom: 20,
        },
      },
    },
  };

  return <PolarArea data={chartData} options={options} />;
}
