import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, BarChart2 } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart';
import { getAllAppointments, type Appointment } from '@/lib/appointments';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, isSameDay } from 'date-fns';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ArcElement
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, ChartLegend, ArcElement);
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FILTER_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'This Month', value: 'month' },
];
const TYPE_OPTIONS = [
  { label: 'ALL', value: 'all' },
  { label: 'Appointment', value: 'appointment' },
  { label: 'Amount', value: 'amount' },
  { label: 'Services', value: 'services' },
];

const SERVICE_LIST = [
  'Teeth Cleaning',
  'Root Canal',
  'Teeth Extraction',
  'Dental Fillings',
  'Dental Crown',
  'Teeth Whitening',
  'Orthodontic Treatment',
  'Dental Implant',
];

// Custom Tooltip for Services Graph
function ServicesTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl bg-white/90 shadow-xl border border-indigo-100 p-3 min-w-[180px]">
      <div className="font-semibold text-indigo-700 mb-1 text-sm">{label}</div>
      <div className="space-y-1">
        {SERVICE_LIST.map((service, idx) => (
          <div key={service} className="flex justify-between text-xs">
            <span className="font-medium text-gray-700">{service}</span>
            <span className="font-mono text-indigo-600">{data[service]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom Tooltip for Appointment/Amount Graphs
function CustomTooltip({ active, payload, label, color, labelText }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl bg-white/90 shadow-xl border border-indigo-100 p-3 min-w-[120px]">
      <div className="font-semibold text-indigo-700 mb-1 text-sm">{label}</div>
      <div className="flex justify-between text-xs">
        <span className="font-medium text-gray-700">{labelText}</span>
        <span className="font-mono" style={{ color }}>{payload[0].value}</span>
      </div>
    </div>
  );
}

// Helper to get the total paid amount for an appointment
function getPaidAmount(apt: Appointment) {
  if (apt.payment) {
    return (apt.payment.cashAmount || 0) + (apt.payment.onlineAmount || 0);
  }
  return (apt.cashAmount || 0) + (apt.onlineAmount || 0);
}

export function Graph() {
  const [filter, setFilter] = useState('7days');
  const [type, setType] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllAppointments().then((data) => {
      setAppointments(data);
      setLoading(false);
    });
  }, []);

  // Date range calculation
  let startDate = new Date();
  let endDate = new Date();
  if (filter === 'today') {
    startDate = endDate = selectedDate;
  } else if (filter === '7days') {
    startDate = subDays(new Date(), 6);
    endDate = new Date();
  } else if (filter === 'month') {
    startDate = startOfMonth(new Date());
    endDate = endOfMonth(new Date());
  }

  // Filtered appointments
  const filteredAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.appointmentDate);
    if (filter === 'today') {
      return isSameDay(aptDate, selectedDate);
    }
    return isWithinInterval(aptDate, { start: startDate, end: endDate });
  });

  // Appointment Graph Data (appointments per day)
  const appointmentData: { date: string; count: number }[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = format(new Date(d), 'yyyy-MM-dd');
    const count = filteredAppointments.filter((apt: any) => apt.appointmentDate === dateStr).length;
    appointmentData.push({ date: dateStr, count });
  }

  // Amount Graph Data (total amount per day)
  const amountData: { date: string; amount: number }[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = format(new Date(d), 'yyyy-MM-dd');
    const amount = filteredAppointments
      .filter((apt: any) => apt.appointmentDate === dateStr)
      .reduce((sum: number, apt: Appointment) => sum + getPaidAmount(apt), 0);
    amountData.push({ date: dateStr, amount });
  }

  // Services Graph Data (date on x-axis, quantity on y-axis)
  const servicesGraphData = appointmentData.map(({ date }) => {
    const entry: any = { date };
    let total = 0;
    SERVICE_LIST.forEach(service => {
      const qty = filteredAppointments.filter((apt: any) => apt.appointmentDate === date && apt.services && apt.services.includes(service)).length;
      entry[service] = qty;
      total += qty;
    });
    entry.quantity = total;
    return entry;
  });

  // Services Graph Data (service on x-axis, quantity on y-axis)
  // Build data for bar chart: each bar is a service, value is count of times used in filteredAppointments
  const servicesBarData = SERVICE_LIST.map(service => {
    const count = filteredAppointments.filter((apt: any) => apt.services && apt.services.includes(service)).length;
    return { service, count };
  });

  // Modern color palette
  const colors = [
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#22d3ee', // Sky
    '#10b981', // Emerald
    '#f59e42', // Orange
    '#f43f5e', // Rose
    '#a21caf', // Purple
    '#fbbf24', // Amber
  ];

  // Responsive grid classes
  const gridClasses = 'grid grid-cols-1 gap-6';

  // UI
  return (
    // Added pb-8 to the main container for padding at the bottom of the content.
    // Also kept mt-8, mb-8 for overall component margins.
    <div className="space-y-8 px-1 md:px-6 max-w-7xl mx-auto w-full md:ml-[240px] md:pl-6 mt-8 mb-8 pb-8">
      {/* Header with filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight drop-shadow-sm">
            <BarChart2 className="h-7 md:h-8 w-7 md:w-8 text-indigo-600" /> Graph
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto justify-end bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-xl p-2 shadow-md">
          <Select value={filter} onValueChange={val => { setFilter(val); if(val !== 'today') setShowDatePicker(false); }}>
            <SelectTrigger className="w-32 md:w-36 bg-white border-2 border-indigo-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg">
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="hover:bg-indigo-100">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="ml-1 border-2 border-indigo-200 bg-white hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-400"
              onClick={() => { setFilter('today'); setShowDatePicker(v => !v); }}
              title="Pick a date"
            >
              <CalendarIcon className="h-5 w-5 text-indigo-500" />
            </Button>
            {showDatePicker && (
              <div className="absolute right-0 z-50 mt-2">
                <DatePicker
                  selected={selectedDate}
                  onChange={date => { setSelectedDate(date as Date); setShowDatePicker(false); setFilter('today'); }}
                  inline
                  className="rounded-lg border-2 border-indigo-200 shadow-lg"
                />
              </div>
            )}
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-32 md:w-36 bg-white border-2 border-indigo-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg">
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="hover:bg-indigo-100">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Graphs */}
      <div className={gridClasses}>
        {(type === 'all' || type === 'appointment') && (
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-indigo-50 border-0">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-indigo-700">Appointment Graph</CardTitle>
              <CardDescription className="text-gray-500">Number of appointments per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Bar
                  data={{
                    labels: appointmentData.map(d => d.date),
                    datasets: [
                      {
                        label: 'Appointments',
                        data: appointmentData.map(d => d.count),
                        backgroundColor: colors[0],
                        borderRadius: 8,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      title: { display: false },
                      tooltip: { enabled: true },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: colors[0],
                          font: { size: 11 },
                          autoSkip: true,
                          maxTicksLimit: 7,
                          callback: function(value, index, values) {
                            if (filter === 'month') {
                              return index % 5 === 0 ? this.getLabelForValue(Number(value)) : '';
                            }
                            return this.getLabelForValue(Number(value));
                          }
                        }
                      },
                      y: {
                        grid: { color: '#e0e7ff' },
                        ticks: {
                          color: colors[0],
                          font: { size: 11 },
                          stepSize: 2,
                          maxTicksLimit: 5,
                        },
                        beginAtZero: true,
                      },
                    },
                    maintainAspectRatio: false,
                  }}
                  height={120}
                  width={320}
                />
              </div>
            </CardContent>
          </Card>
        )}
        {(type === 'all' || type === 'amount') && (
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-cyan-50 border-0">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-cyan-700">Amount Graph</CardTitle>
              <CardDescription className="text-gray-500">Total amount collected per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Bar
                  data={{
                    labels: amountData.map(d => d.date),
                    datasets: [
                      {
                        label: 'Amount',
                        data: amountData.map(d => d.amount),
                        backgroundColor: colors[1],
                        borderRadius: 8,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      title: { display: false },
                      tooltip: { enabled: true },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: colors[1],
                          font: { size: 11 },
                          autoSkip: true,
                          maxTicksLimit: 7,
                          callback: function(value, index, values) {
                            if (filter === 'month') {
                              return index % 5 === 0 ? this.getLabelForValue(Number(value)) : '';
                            }
                            return this.getLabelForValue(Number(value));
                          }
                        }
                      },
                      y: {
                        grid: { color: '#bae6fd' },
                        ticks: {
                          color: colors[1],
                          font: { size: 11 },
                          stepSize: 2000, // Adjust as needed for your data range
                          maxTicksLimit: 5,
                        },
                        beginAtZero: true,
                      },
                    },
                    maintainAspectRatio: false,
                  }}
                  height={120}
                  width={320}
                />
              </div>
            </CardContent>
          </Card>
        )}
        {(type === 'all' || type === 'services') && (
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-amber-50 border-0">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-amber-700">Services Graph</CardTitle>
              <CardDescription className="text-gray-500">Number of times each service was used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Bar
                  data={{
                    labels: servicesBarData.map(d => d.service),
                    datasets: [
                      {
                        label: 'Service Count',
                        data: servicesBarData.map(d => d.count),
                        backgroundColor: colors.slice(0, servicesBarData.length),
                        borderRadius: 8,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      title: { display: false },
                      tooltip: { enabled: true },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: colors[4],
                          font: { size: 11 },
                          autoSkip: false, // Show all service names
                        }
                      },
                      y: {
                        grid: { color: '#fde68a' },
                        ticks: {
                          color: colors[4],
                          font: { size: 11 },
                          stepSize: 2,
                          maxTicksLimit: 5,
                        },
                        beginAtZero: true,
                      },
                    },
                    maintainAspectRatio: false,
                  }}
                  height={120}
                  width={320}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* These divs provide additional spacing below the graphs if needed */}
      {loading && <div className="text-center text-gray-500 py-8">Loading...</div>}
      {!loading && filteredAppointments.length === 0 && (
        <div className="text-center text-gray-400 font-medium py-8">No data available for the selected filter.</div>
      )}
    </div>
  );
}

export default Graph;