'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { subscribeToAppointments, updateAppointment, deleteAppointment, type Appointment } from '@/lib/appointments';
import { Search, Trash2, Calendar, DollarSign, Clock, AlertTriangle, CheckCircle2, Eye, Lock } from 'lucide-react';
import { PaymentModal } from './payment-modal';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, isAfter, isSameWeek, addWeeks } from 'date-fns';
import { useUser } from '@/components/ui/UserContext';

export function AppointmentsTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const { role } = useUser();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const unsubscribe = subscribeToAppointments((data) => {
      // Only show pending appointments (not completed)
      let pending = data.filter((apt: Appointment) => apt.status !== 'completed');
      // For staff, filter to only today's appointments
      if (role === 'staff') {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        pending = pending.filter(apt => apt.appointmentDate === todayStr);
      }
      setAppointments(pending);
      applyFilters(pending, searchTerm, dateFilter);
    });

    return () => unsubscribe();
  }, []);

  const isAppointmentEditable = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const currentWeek = new Date();
    return isSameWeek(appointmentDate, currentWeek) || !isAfter(appointmentDate, addWeeks(currentWeek, 1));
  };

  const getAppointmentStatus = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const currentWeek = new Date();

    if (isSameWeek(appointmentDate, currentWeek)) {
      return { status: 'current', label: 'This Week', color: 'bg-green-100 text-green-700' };
    } else if (isAfter(appointmentDate, addWeeks(currentWeek, 1))) {
      return { status: 'future', label: 'Future', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { status: 'past', label: 'Past', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const applyFilters = (appointmentsList: Appointment[], search: string, filter: string) => {
    let filtered = appointmentsList;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(apt =>
        apt.patientName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply date filter
    const now = new Date();
    // For admin, filter by appointmentDate; for others, keep existing logic
    if (role === 'admin') {
      switch (filter) {
        case 'today':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfDay(now) && appointmentDate <= endOfDay(now);
          });
          break;
        case 'week':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfWeek(now) && appointmentDate <= endOfWeek(now);
          });
          break;
        case 'month':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfMonth(now) && appointmentDate <= endOfMonth(now);
          });
          break;
        case 'year':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            return appointmentDate >= startOfYear(now) && appointmentDate <= endOfYear(now);
          });
          break;
        default:
          // 'all' - no additional filtering
          break;
      }
    } else {
      // Logic for staff (or other roles not 'admin')
      switch (filter) {
        case 'today':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.createdAt);
            return appointmentDate >= startOfDay(now) && appointmentDate <= endOfDay(now);
          });
          break;
        case 'week':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.createdAt);
            return appointmentDate >= startOfWeek(now) && appointmentDate <= endOfWeek(now);
          });
          break;
        case 'month':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.createdAt);
            return appointmentDate >= startOfMonth(now) && appointmentDate <= endOfMonth(now);
          });
          break;
        case 'year':
          filtered = filtered.filter(apt => {
            const appointmentDate = new Date(apt.createdAt);
            return appointmentDate >= startOfYear(now) && appointmentDate <= endOfYear(now);
          });
          break;
        default:
          // 'all' - no additional filtering
          break;
      }
    }

    setFilteredAppointments(filtered);
  };

  useEffect(() => {
    applyFilters(appointments, searchTerm, dateFilter);
  }, [searchTerm, dateFilter, appointments]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointment(id);
        toast.success('Appointment deleted successfully');
      } catch (error) {
        toast.error('Failed to delete appointment');
      }
    }
  };

  const handleMarkDone = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentComplete = async (paymentData: any) => {
    if (!selectedAppointment) return;

    try {
      await updateAppointment(selectedAppointment.id!, {
        status: 'completed',
        payment: {
          paymentMethod: paymentData.paymentMethod,
          cashAmount: paymentData.cashAmount,
          onlineAmount: paymentData.onlineAmount,
          createdAt: paymentData.createdAt,
        },
      });

      toast.success('Appointment has been completed! Check in view attended appointments.');
      setIsPaymentModalOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      toast.error('Failed to complete appointment');
    }
  };

  const getTotalServiceCharge = (appointment: Appointment) => {
    if (appointment.serviceCharges) {
      return Object.values(appointment.serviceCharges).reduce((sum, charge) => sum + charge, 0);
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-orange-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-gray-900">Pending Appointments</CardTitle>
              <p className="text-gray-600">Manage appointments and process payments</p>
            </div>
          </div>
          {/* Only show search bar and date filter for admin */}
          {role !== 'staff' && (
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40 border-gray-300 focus:border-orange-500">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left p-3 font-medium">Sr. No.</th>
                  <th className="text-left p-3 font-medium">Patient Name</th>
                  <th className="text-left p-3 font-medium">Age</th>
                  <th className="text-left p-3 font-medium">Gender</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Doctor</th>
                  <th className="text-left p-3 font-medium">Services</th>
                  <th className="text-left p-3 font-medium">Service Charge</th>
                  <th className="text-left p-3 font-medium">Date & Time</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment, index) => {
                  const appointmentStatus = getAppointmentStatus(appointment);
                  const isEditable = isAppointmentEditable(appointment);
                  const serviceCharge = getTotalServiceCharge(appointment);
                  const isCompleted = appointment.status === 'completed';

                  return (
                    <tr key={appointment.id} className={`border-b hover:bg-gray-50 ${!isEditable && !isCompleted ? 'opacity-60' : ''} ${isCompleted ? 'bg-green-50' : ''}`}>
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-medium">
                        {appointment.patientName}
                        {isCompleted && <Lock className="inline h-3 w-3 ml-1 text-green-600" />}
                      </td>
                      <td className="p-3">{appointment.age}</td>
                      <td className="p-3">{appointment.gender}</td>
                      <td className="p-3">{appointment.contactNumber}</td>
                      <td className="p-3">{appointment.email || 'N/A'}</td>
                      <td className="p-3">{appointment.doctor}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {appointment.services?.map((service, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {service}
                            </Badge>
                          )) || appointment.services}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {/* Changed DollarSign to Indian Rupee symbol directly and removed the Lucide icon */}
                          <span className="font-medium text-green-600">₹{serviceCharge}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <div>{appointment.appointmentDate}</div>
                          <div className="text-gray-500">{appointment.appointmentTime}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                          {isCompleted ? 'Completed' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {isCompleted ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Payment Complete</span>
                          </div>
                        ) : isEditable ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleMarkDone(appointment)}
                              className="bg-green-600 hover:bg-green-700 shadow-md"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Done
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(appointment.id!)}
                              className="shadow-md"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs">Read Only</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredAppointments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No appointments found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentComplete={handlePaymentComplete}
        appointment={selectedAppointment}
      />
    </div>
  );
}