const planDetails = {
  name: 'Pro',
  expiry: 'Dec 31, 2025',
};

const stats = {
  activeQuizzes: 0,
  totalQuizzes: 0,
  totalFlashcards: 0,
};

const lineChartOptions = {
  chart: {
    toolbar: { show: false },
    dropShadow: {
      enabled: true,
      top: 8,
      left: 0,
      blur: 8,
      opacity: 0.1,
      color: '#4318FF',
    },
  },
  colors: ['#4318FF'],
  markers: {
    size: 4,
    colors: 'white',
    strokeColors: '#7551FF',
    strokeWidth: 2,
  },
  tooltip: { theme: 'dark' },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', type: 'line' },
  xaxis: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    labels: {
      style: {
        colors: '#A3AED0',
        fontSize: '12px',
        fontWeight: '500',
      },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: { show: false },
  grid: { show: false },
};

const barChartOptions = {
  chart: {
    toolbar: { show: false },
  },
  tooltip: { theme: 'dark' },
  xaxis: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    labels: {
      style: {
        colors: '#A3AED0',
        fontSize: '12px',
        fontWeight: '500',
      },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: { show: false },
  grid: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    bar: { borderRadius: 8, columnWidth: '18px' },
  },
  colors: ['#4318FF'],
};

export {
  barChartOptions,
  lineChartOptions,
  planDetails,
  stats,
};
