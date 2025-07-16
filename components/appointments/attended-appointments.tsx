'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Search, Calendar, Filter, CheckCircle, TrendingUp, CalendarDays, Pencil, ChevronDown } from 'lucide-react';
import { subscribeToAppointments, type Appointment, updateAppointment, getAllAppointments, getAppointmentsByDate } from '@/lib/appointments';
import { InvoiceModal } from './invoice-modal';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, parseISO, isValid } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/components/ui/UserContext';

export function AttendedAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [specificDate, setSpecificDate] = useState('');
  const [weekDate, setWeekDate] = useState('');
  const [monthDate, setMonthDate] = useState('');
  const [yearDate, setYearDate] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<Appointment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const { role } = useUser();
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAppointments((data) => {
      const attendedAppointments = data.filter(apt => apt.status === 'completed');
      setAppointments(attendedAppointments);
      applyFilters(attendedAppointments, searchTerm, dateFilter, specificDate, weekDate, monthDate, yearDate);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch unique doctors and services from all appointments
    getAllAppointments().then((appointments) => {
      const doctorsSet = new Set<string>();
      const servicesSet = new Set<string>();
      appointments.forEach(apt => {
        if (apt.doctor) doctorsSet.add(apt.doctor);
        (apt.services || []).forEach(s => servicesSet.add(s));
      });
      setDoctorOptions(Array.from(doctorsSet));
      setServiceOptions(Array.from(servicesSet));
    });
  }, []);

  const applyFilters = (appointmentsList: Appointment[], search: string, filter: string, specDate?: string, weekDt?: string, monthDt?: string, yearDt?: string) => {
    let filtered = appointmentsList;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(apt =>
        apt.patientName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply date filter
    const now = new Date();
    switch (filter) {
      case 'today':
        if (specDate) {
          const targetDate = parseISO(specDate);
          if (isValid(targetDate)) {
            filtered = filtered.filter(apt => {
              const appointmentDate = new Date(apt.appointmentDate);
              return appointmentDate >= startOfDay(targetDate) && appointmentDate <= endOfDay(targetDate);
            });
          }
        } else {
          // Default to today
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfDay(now) && appointmentDate <= endOfDay(now);
          });
        }
        break;
      case 'week':
        if (weekDt) {
          const targetWeekDate = parseISO(weekDt);
          if (isValid(targetWeekDate)) {
            filtered = filtered.filter(apt => {
              const appointmentDate = new Date(apt.appointmentDate);
              return appointmentDate >= startOfWeek(targetWeekDate) && appointmentDate <= endOfWeek(targetWeekDate);
            });
          }
        } else {
          // Current week if no specific week selected
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfWeek(now) && appointmentDate <= endOfWeek(now);
          });
        }
        break;
      case 'month':
        if (monthDt) {
          const targetMonthDate = parseISO(monthDt + '-01');
          if (isValid(targetMonthDate)) {
            filtered = filtered.filter(apt => {
              const appointmentDate = new Date(apt.appointmentDate);
              return appointmentDate >= startOfMonth(targetMonthDate) && appointmentDate <= endOfMonth(targetMonthDate);
            });
          }
        } else {
          // Current month if no specific month selected
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfMonth(now) && appointmentDate <= endOfMonth(now);
          });
        }
        break;
      case 'year':
        if (yearDt) {
          const targetYearDate = parseISO(yearDt + '-01-01');
          if (isValid(targetYearDate)) {
            filtered = filtered.filter(apt => {
              const appointmentDate = new Date(apt.appointmentDate);
              return appointmentDate >= startOfYear(targetYearDate) && appointmentDate <= endOfYear(targetYearDate);
            });
          }
        } else {
          // Current year if no specific year selected
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfYear(now) && appointmentDate <= endOfYear(now);
          });
        }
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredAppointments(filtered);
  };

  useEffect(() => {
    if (dateFilter === 'month') {
      console.log('Selected monthDate:', monthDate);
      const now = new Date();
      const targetMonthDate = monthDate ? new Date(monthDate + '-01') : now;
      const filtered = appointments.filter(apt => {
        const appointmentDate = new Date(apt.appointmentDate);
        const match = appointmentDate >= startOfMonth(targetMonthDate) && appointmentDate <= endOfMonth(targetMonthDate);
        if (match) {
          console.log('Matched appointment:', apt);
        }
        return match;
      });
      console.log('Filtered appointments for month:', filtered);
    }
    applyFilters(appointments, searchTerm, dateFilter, specificDate, weekDate, monthDate, yearDate);
  }, [searchTerm, dateFilter, appointments, specificDate, weekDate, monthDate, yearDate]);

  const handleViewInvoice = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsInvoiceOpen(true);
  };

  const handleEdit = async (appointment: Appointment) => {
    // Fetch the latest data from Firebase for this appointment
    let baseAppointment = appointment;
    if (appointment.createdAt) {
      const createdDate = new Date(appointment.createdAt);
      const year = createdDate.getFullYear().toString();
      const month = (createdDate.getMonth() + 1).toString().padStart(2, '0');
      const day = createdDate.getDate().toString().padStart(2, '0');
      const appointments = await getAppointmentsByDate(year, month, day);
      const latest = appointments.find(a => a.id === appointment.id);
      if (latest) baseAppointment = latest;
    }
    // If payment object exists, use its values to auto-fill
    let editObj = { ...baseAppointment };
    if (baseAppointment.payment) {
      editObj.paymentMethod = baseAppointment.payment.paymentMethod;
      editObj.cashAmount = baseAppointment.payment.cashAmount;
      editObj.onlineAmount = baseAppointment.payment.onlineAmount;
    }
    setEditData(editObj);
    setIsEditOpen(true);
  };

  const handleEditChange = (field: keyof Appointment, value: any) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const handleEditSave = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      // Always update the payment object with the current values
      const payment = {
        paymentMethod: editData.paymentMethod || '',
        cashAmount: editData.cashAmount || 0,
        onlineAmount: editData.onlineAmount || 0,
        createdAt: editData.payment?.createdAt || new Date().toISOString(),
      };
      // Remove root payment fields to avoid sending undefined
      const { paymentMethod, cashAmount, onlineAmount, ...rest } = editData;
      await updateAppointment(editData.id!, {
        ...rest,
        payment,
      });
      setIsEditOpen(false);
    } catch (e) {
      alert('Failed to update appointment');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get the total paid amount for an appointment
  const getPaidAmount = (apt: Appointment) => {
    if (apt.payment) {
      return (apt.payment.cashAmount || 0) + (apt.payment.onlineAmount || 0);
    }
    return (apt.cashAmount || 0) + (apt.onlineAmount || 0);
  };

  const getTotalAmount = () => {
    return filteredAppointments.reduce((sum, apt) => sum + getPaidAmount(apt), 0);
  };

  const resetDateInputs = () => {
    setSpecificDate('');
    setWeekDate('');
    setMonthDate('');
    setYearDate('');
  };

  const handleFilterChange = (value: string) => {
    setDateFilter(value);
    resetDateInputs();
  };

  const paymentMethods = ['Cash', 'Online', 'Cash+Online'];

  // Filter data for staff to only today's attended appointments
  const filteredAttended = role === 'staff'
    ? appointments.filter(a => format(new Date(a.appointmentDate), 'yyyy-MM-dd') === today)
    : appointments;

  return (
    <div className="space-y-6 px-1 md:px-0 max-w-7xl mx-auto w-full">
      <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-teal-50 to-blue-50 rounded-3xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-teal-200 to-blue-200 rounded-2xl shadow-md">
                <CheckCircle className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl text-blue-900 font-extrabold tracking-tight">Attended Appointments</CardTitle>
                <p className="text-blue-600 text-sm md:text-base font-medium">View completed appointments with advanced filtering</p>
              </div>
            </div>
            {/* Only show search bar, date filter, and revenue box for admin */}
            {role !== 'staff' && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-teal-100 to-blue-100 px-4 py-2 rounded-xl shadow-sm">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                <div className="text-right">
                  <div className="text-xs md:text-sm text-teal-700 font-semibold">Total Revenue</div>
                  <div className="text-base md:text-lg font-bold text-blue-900">₹{getTotalAmount().toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
          {/* Search and Filter Controls */}
          {role !== 'staff' && (
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
                <Input
                  placeholder="Search by patient name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-blue-200 focus:border-teal-400 focus:ring-teal-300 rounded-xl text-sm md:text-base bg-gradient-to-r from-white to-blue-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-400" />
                <Select value={dateFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-40 md:w-48 border-blue-200 focus:border-teal-400 rounded-xl text-sm md:text-base bg-gradient-to-r from-white to-blue-50">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Week Wise</SelectItem>
                    <SelectItem value="month">Month Wise</SelectItem>
                    <SelectItem value="year">Year Wise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {/* Advanced Date Filter Inputs */}
          {role !== 'staff' && (
            <div className="flex flex-wrap gap-4 mt-4">
              {dateFilter === 'today' && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  <Input
                    type="date"
                    value={specificDate || today}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-36 md:w-40 border-blue-200 focus:border-teal-400 focus:ring-teal-300 rounded-xl text-sm md:text-base bg-gradient-to-r from-white to-blue-50"
                    placeholder="Select date"
                  />
                  <span className="text-xs md:text-sm text-blue-500">Select specific date</span>
                </div>
              )}
              {dateFilter === 'week' && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  <Input
                    type="date"
                    value={weekDate}
                    onChange={(e) => setWeekDate(e.target.value)}
                    className="w-36 md:w-40 border-blue-200 focus:border-teal-400 focus:ring-teal-300 rounded-xl text-sm md:text-base bg-gradient-to-r from-white to-blue-50"
                    placeholder="Select week"
                  />
                  <span className="text-xs md:text-sm text-blue-500">Select any date in the week</span>
                </div>
              )}
              {dateFilter === 'month' && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  <div className="relative">
                    <Input
                      type="month"
                      value={monthDate}
                      onChange={(e) => setMonthDate(e.target.value)}
                      className="w-36 md:w-40 border-blue-200 focus:border-teal-400 focus:ring-teal-300 rounded-xl text-sm md:text-base bg-gradient-to-r from-white to-blue-50 pr-10"
                      placeholder="Select month"
                      ref={monthInputRef}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 focus:outline-none"
                      onClick={() => monthInputRef.current && monthInputRef.current.showPicker ? monthInputRef.current.showPicker() : monthInputRef.current?.focus()}
                    >
                      <Calendar className="h-5 w-5" />
                    </button>
                  </div>
                  <span className="text-xs md:text-sm text-blue-500">Select month and year</span>
                </div>
              )}
              {dateFilter === 'year' && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  <Input
                    type="number"
                    value={yearDate}
                    onChange={(e) => setYearDate(e.target.value)}
                    min="2020"
                    max={new Date().getFullYear()}
                    className="w-28 md:w-32 border-blue-200 focus:border-teal-400 focus:ring-teal-300 rounded-xl text-sm md:text-base bg-gradient-to-r from-white to-blue-50"
                    placeholder="Enter year"
                  />
                  <span className="text-xs md:text-sm text-blue-500">Enter year (e.g., 2024)</span>
                </div>
              )}
            </div>
          )}
          {/* Filter Summary */}
          {role !== 'staff' && dateFilter !== 'all' && (
            <div className="mt-2 p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-blue-100">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                {dateFilter === 'today' && (
                  <div className="text-xs md:text-sm text-blue-700">
                    <strong>Active Filter:</strong> Date: {format(specificDate ? parseISO(specificDate) : new Date(), 'PPP')}
                  </div>
                )}
                <div className="text-xs md:text-sm font-medium text-blue-600">
                  {filteredAppointments.length} appointment(s) found
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 shadow-lg">
            <table className="w-full border-collapse min-w-[700px] md:min-w-full text-xs md:text-sm">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-white">
                <tr className="border-b-2 border-blue-200">
                  <th className="text-left p-3 font-semibold text-blue-900">Sr. No.</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Patient Name</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Age</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Gender</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Contact</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Doctor</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Services</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Date & Time</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Amount</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Status</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(role === 'staff' ? filteredAttended : filteredAppointments).map((appointment, index) => (
                  <tr key={appointment.id} className="border-b hover:bg-blue-50 transition-colors">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3 font-medium text-blue-900">{appointment.patientName}</td>
                    <td className="p-3">{appointment.age}</td>
                    <td className="p-3">{appointment.gender}</td>
                    <td className="p-3">{appointment.contactNumber}</td>
                    <td className="p-3">{appointment.doctor}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {appointment.services?.map((service, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                            {service}
                          </Badge>
                        )) || 'N/A'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs md:text-sm">
                        <div>{appointment.appointmentDate}</div>
                        <div className="text-blue-500">{appointment.appointmentTime}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs md:text-sm">
                        <div className="font-medium text-teal-700">₹{getPaidAmount(appointment)}</div>
                        <div className="text-blue-500 capitalize text-xs">{appointment.paymentMethod}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className="bg-gradient-to-r from-teal-100 to-blue-100 text-teal-700 border-teal-200 text-xs md:text-sm shadow-sm">
                        Completed
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewInvoice(appointment)}
                        className="hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800 shadow-sm rounded-lg mr-2"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(appointment)}
                        className="hover:bg-amber-100 border-amber-200 text-amber-700 hover:text-amber-800 shadow-sm rounded-lg"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAttended.length === 0 && (
              <div className="text-center py-8 text-blue-400">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="h-12 w-12 text-blue-200" />
                  <p className="text-lg font-medium">No attended appointments found</p>
                  <p className="text-sm">Try adjusting your search criteria or date filters</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        appointment={selectedAppointment}
      />
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl bg-gradient-to-br from-white to-amber-50 border-0 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-amber-700 mb-2">Edit Appointment</DialogTitle>
          </DialogHeader>
          {editData && (
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                  <input className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400" value={editData.patientName} onChange={e => handleEditChange('patientName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400" value={editData.age} onChange={e => handleEditChange('age', Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <input className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400" value={editData.gender} onChange={e => handleEditChange('gender', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400" value={editData.contactNumber} onChange={e => handleEditChange('contactNumber', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400" value={editData.doctor} onChange={e => handleEditChange('doctor', e.target.value)}>
                  <option value="">Select doctor</option>
                  {doctorOptions.map(doc => <option key={doc} value={doc}>{doc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Services (Multiple selection allowed)</label>
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setIsServicesOpen(!isServicesOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 ${!editData.services?.length ? 'border-amber-300' : 'border-amber-400'}`}
                  >
                    <span className="text-gray-700">
                      {editData.services?.length === 0
                        ? 'Select services...'
                        : `${editData.services.length} service(s) selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 text-amber-400" />
                  </button>
                  {isServicesOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-amber-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {serviceOptions.map((service) => (
                        <label
                          key={service}
                          className="flex items-center justify-between px-3 py-2 hover:bg-amber-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editData.services?.includes(service) || false}
                              onChange={e => {
                                let updated = editData.services ? [...editData.services] : [];
                                if (e.target.checked) {
                                  updated.push(service);
                                } else {
                                  updated = updated.filter(s => s !== service);
                                }
                                handleEditChange('services', updated);
                              }}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-sm text-gray-700">{service}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {editData.services && editData.services.length > 0 && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-lg flex flex-wrap gap-2">
                    {editData.services.map((service) => (
                      <span key={service} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <Select value={editData.paymentMethod || ''} onValueChange={val => handleEditChange('paymentMethod', val)}>
                  <SelectTrigger className="mt-1 border-amber-300 focus:border-amber-500">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cash+online">Cash + Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editData.paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                  <Input type="number" value={editData.cashAmount || ''} onChange={e => handleEditChange('cashAmount', Number(e.target.value))} />
                </div>
              )}
              {editData.paymentMethod === 'online' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Online Amount</label>
                  <Input type="number" value={editData.onlineAmount || ''} onChange={e => handleEditChange('onlineAmount', Number(e.target.value))} />
                </div>
              )}
              {editData.paymentMethod === 'cash+online' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                    <Input type="number" value={editData.cashAmount || ''} onChange={e => handleEditChange('cashAmount', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Online Amount</label>
                    <Input type="number" value={editData.onlineAmount || ''} onChange={e => handleEditChange('onlineAmount', Number(e.target.value))} />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg">Cancel</Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}