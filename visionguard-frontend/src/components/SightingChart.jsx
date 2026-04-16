import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SightingChart({ stats }) {
  const data = {
    labels: ['Snakes', 'Cats', 'Geckos'],
    datasets: [
      {
        data: [stats.snake, stats.cat, stats.gecko],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderColor: ['#991b1b', '#92400e', '#064e3b'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8' } },
    },
    cutout: '70%',
  };

  return <Doughnut data={data} options={options} />;
}