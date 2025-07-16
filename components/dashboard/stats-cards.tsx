'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { Input } from '@/components/ui/input';   // Assuming you have an Input component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subscribeToAppointments, type Appointment } from '@/lib/appointments';
import { Calendar, DollarSign, XCircle } from 'lucide-react'; // Added XCircle for clear button
import { format, isSameDay, isSameWeek, isSameMonth, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay } from 'date-fns';
import DatePicker from 'react-datepicker'; // Import DatePicker
import 'react-datepicker/dist/react-datepicker.css'; // Import DatePicker CSS

const FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom Range', value: 'custom' }, // Changed label for clarity
];

export function StatsCards() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState('today');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAppointments((data) => {
      setAppointments(data);
    });
    return () => unsubscribe();
  }, []);

  // Helper to get paid amounts
  const getPaid = (apt: Appointment) => {
    if (apt.payment) {
      return {
        cash: apt.payment.cashAmount || 0,
        online: apt.payment.onlineAmount || 0,
      };
    }
    return {
      cash: apt.cashAmount || 0,
      online: apt.onlineAmount || 0,
    };
  };

  // Filter appointments by selected filter
  const today = new Date();
  let filteredAppointments = appointments;

  let currentStartDate: Date | null = null;
  let currentEndDate: Date | null = null;

  if (filter === 'today') {
    currentStartDate = startOfDay(today);
    currentEndDate = endOfDay(today);
  } else if (filter === 'week') {
    currentStartDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start of week
    currentEndDate = endOfWeek(today, { weekStartsOn: 1 });
  } else if (filter === 'month') {
    currentStartDate = startOfMonth(today);
    currentEndDate = endOfMonth(today);
  } else if (filter === 'custom' && customStart && customEnd) {
    currentStartDate = customStart;
    currentEndDate = customEnd;
  }

  // Apply the date range filtering
  if (currentStartDate && currentEndDate) {
    filteredAppointments = appointments.filter(apt => {
      const aptDate = parseISO(apt.appointmentDate); // Parse date string to Date object
      return isWithinInterval(aptDate, { start: currentStartDate!, end: currentEndDate! });
    });
  }


  // Calculate totals
  const totalCash = filteredAppointments.reduce((sum, apt) => sum + getPaid(apt).cash, 0);
  const totalOnline = filteredAppointments.reduce((sum, apt) => sum + getPaid(apt).online, 0);
  const totalAmount = totalCash + totalOnline;
  const totalAppointments = filteredAppointments.length;

  const handleClearFilters = () => {
    setFilter('today');
    setCustomStart(null);
    setCustomEnd(null);
  };

  return (
    <div className="space-y-8 mb-8">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-white border border-gray-200">
        <label className="font-semibold text-gray-700 sr-only">Filter by Date Range:</label> {/* Screen reader only */}
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] md:w-[200px] bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400">
            <SelectValue placeholder="Select Date Range" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg">
            {FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value} className="hover:bg-blue-50">{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filter === 'custom' && (
          <div className="flex items-center gap-2">
            <DatePicker
              selected={customStart}
              onChange={(date: Date | null) => setCustomStart(date)}
              selectsStart
              startDate={customStart || undefined}
              endDate={customEnd || undefined}
              placeholderText="Start Date"
              className="border rounded-lg px-3 py-2 w-32 md:w-36 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              dateFormat="yyyy-MM-dd"
              isClearable
            />
            <span className="text-gray-500">-</span>
            <DatePicker
              selected={customEnd}
              onChange={(date: Date | null) => setCustomEnd(date)}
              selectsEnd
              startDate={customStart || undefined}
              endDate={customEnd || undefined}
              minDate={customStart || undefined}
              placeholderText="End Date"
              className="border rounded-lg px-3 py-2 w-32 md:w-36 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              dateFormat="yyyy-MM-dd"
              isClearable
            />
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="flex items-center gap-1 text-gray-600 border-gray-300 hover:text-red-500 hover:border-red-300 transition-colors duration-200"
          aria-label="Clear filters"
        >
          <XCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Amount Card */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-green-100 to-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0 mb-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base font-semibold text-gray-800 tracking-tight">Total Amount</CardTitle>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">₹{totalAmount.toLocaleString()}</div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-700 font-semibold">Cash: ₹{totalCash.toLocaleString()}</span>
                <span className="text-blue-700 font-semibold">Online: ₹{totalOnline.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-13 h-13 rounded-xl shadow-md bg-green-200">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </CardHeader>
        </Card>
        {/* Total Appointments Card */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-blue-100 to-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0 mb-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base font-semibold text-gray-800 tracking-tight">Total Appointments</CardTitle>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">{totalAppointments}</div>
            </div>
            <div className="flex items-center justify-center w-13 h-13 rounded-xl shadow-md bg-blue-200">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </CardHeader>
        </Card>
      </div>
      {/* Appointments List */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Appointments List</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-semibold">#</th>
                <th className="p-3 text-left font-semibold">Patient</th>
                <th className="p-3 text-left font-semibold">Doctor</th>
                <th className="p-3 text-left font-semibold">Date</th>
                <th className="p-3 text-left font-semibold">Time</th>
                <th className="p-3 text-left font-semibold">Cash</th>
                <th className="p-3 text-left font-semibold">Online</th>
                <th className="p-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No appointments found for this filter.</td>
                </tr>
              ) : (
                filteredAppointments.map((apt, idx) => {
                  const paid = getPaid(apt);
                  return (
                    <tr key={apt.id || idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3 font-medium text-gray-900">{apt.patientName}</td>
                      <td className="p-3">{apt.doctor}</td>
                      <td className="p-3">{apt.appointmentDate}</td>
                      <td className="p-3">{apt.appointmentTime}</td>
                      <td className="p-3 text-green-700 font-semibold">₹{paid.cash.toLocaleString()}</td>
                      <td className="p-3 text-blue-700 font-semibold">₹{paid.online.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}