"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Search, Calendar, Filter, CheckCircle, TrendingUp, CalendarDays, Pencil, ChevronDown, Send, FileText } from "lucide-react" // Added Send/FileText

// Firebase Imports
import { getDatabase, ref, set, get, onValue, off } from "firebase/database"
import { database } from "@/lib/firebase" 

// Date Utility Imports
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isValid,
  subDays,
} from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// --- UPDATED: Replaced mock hook with real UserContext import ---
import { useUser } from '@/components/ui/UserContext'

// --- NEW: Import html2canvas ---
import html2canvas from 'html2canvas';
import React from "react"

// Mock imports for demonstration completeness 
const InvoiceModal = ({ isOpen, onClose, appointment }: any) => isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold">Invoice for {appointment?.patientName}</h2>
            <p className="mt-2">Total Paid: ₹{appointment?.payment?.cashAmount + appointment?.payment?.onlineAmount || 0}</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
    </div>
) : null;


// --- INTERFACE DEFINITION ---
export interface Appointment {
  id?: string;
  patientName: string;
  age: number;
  gender: string;
  contactNumber: string;
  doctor: string;
  services: string[];
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'completed' | 'cancelled';
  cashAmount?: number;
  onlineAmount?: number;
  note?: string; 
  payment?: {
    paymentMethod: string;
    cashAmount: number;
    onlineAmount: number;
    discountAmount: number;
    cashType: string;
    onlineType: string;
    createdAt: string;
  };
  paymentMethod: string;
  createdAt?: string;
  updatedAt?: string;
}

// Extended type for editing appointments with payment fields at root level
type AppointmentWithPaymentFields = Appointment & {
  discountAmount?: number
  cashType?: string
  onlineType?: string
}

// --- APPOINTMENT UTILITIES (Firebase helpers remain the same) ---

const snapshotToAppointments = (snapshot: any): Appointment[] => {
    const appointments: Appointment[] = [];
    if (!snapshot.exists()) return appointments;

    const years = snapshot.val();
    if (!years) return appointments;

    Object.keys(years).forEach(year => {
        const months = years[year];
        Object.keys(months).forEach(month => {
            const days = months[month];
            Object.keys(days).forEach(day => {
                const dailyAppointments = days[day];
                Object.keys(dailyAppointments).forEach(id => {
                    const appointment = dailyAppointments[id];
                    appointments.push({ ...appointment, id });
                });
            });
        });
    });
    return appointments;
};

export async function getDoctorOptionsFromDB(): Promise<string[]> {
    const doctorsRef = ref(database, 'doctor');
    try {
        const snapshot = await get(doctorsRef);
        if (snapshot.exists()) {
            const doctorsArray: Array<{ name: string } | null> = snapshot.val();
            return doctorsArray
                .filter((d): d is { name: string } => d !== null && typeof d === 'object' && 'name' in d)
                .map(d => d.name);
        }
        return [];
    } catch (error) {
        console.error("Firebase fetch error (Doctors):", error);
        return [];
    }
}

export async function getServiceOptionsFromDB(): Promise<string[]> {
    const servicesRef = ref(database, 'services_master');
    try {
        const snapshot = await get(servicesRef);
        if (snapshot.exists()) {
            const servicesObject = snapshot.val();
            return Object.values(servicesObject)
                .map((service: any) => service?.name)
                .filter((name: any): name is string => typeof name === 'string');
        }
        return [];
    } catch (error) {
        console.error("Firebase fetch error (Services):", error);
        return [];
    }
}

export const subscribeToAppointments = (callback: (data: Appointment[]) => void) => {
    const appointmentsRef = ref(database, 'appointments');

    const listener = onValue(appointmentsRef, (snapshot) => {
        const data = snapshotToAppointments(snapshot);
        callback(data);
    }, (error) => {
        console.error("Error subscribing to appointments:", error);
    });

    return () => off(appointmentsRef, 'value', listener);
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<void> => {
    if (!updates.createdAt) {
        throw new Error("Missing creation date for update path calculation.");
    }

    const date = new Date(updates.createdAt);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const path = `appointments/${year}/${month}/${day}/${id}`;
    const appointmentRef = ref(database, path);

    const existingSnapshot = await get(appointmentRef);
    if (!existingSnapshot.exists()) {
        throw new Error("Appointment not found at calculated path.");
    }
    const existingData = existingSnapshot.val();

    const finalUpdates = {
        ...existingData,
        ...updates,
        updatedAt: new Date().toISOString(),
        payment: {
            ...existingData.payment,
            ...updates.payment,
        }
    }

    await set(appointmentRef, finalUpdates);
    console.log(`Appointment ${id} updated successfully at path: ${path}`);
};

export const getAppointmentsByDate = async (year: string, month: string, day: string): Promise<Appointment[]> => {
    const dailyRef = ref(database, `appointments/${year}/${month}/${day}`);
    const snapshot = await get(dailyRef);
    if (!snapshot.exists()) return [];

    const appointments: Appointment[] = [];
    const dailyAppointments = snapshot.val();
    Object.keys(dailyAppointments).forEach(id => {
        appointments.push({ ...dailyAppointments[id], id });
    });
    return appointments;
};

// --- Date filter display utility ---
const getFilterDisplay = (filter: string, dateInfo: any) => {
    const now = new Date();
    switch (filter) {
        case 'today':
            const date = dateInfo.specificDate ? new Date(dateInfo.specificDate) : now;
            return `Date: ${format(date, 'PPP')}`;
        case 'week':
            const weekDt = dateInfo.weekDate ? new Date(dateInfo.weekDate) : now;
            return `Week of: ${format(startOfWeek(weekDt), 'MMM dd')} - ${format(endOfWeek(weekDt), 'MMM dd, yyyy')}`;
        case 'month':
            const monthDt = dateInfo.monthDate ? new Date(dateInfo.monthDate + "-01") : now;
            return `Month: ${format(monthDt, 'MMMM yyyy')}`;
        case 'year':
            const yearDt = dateInfo.yearDate ? new Date(dateInfo.yearDate + "-01-01") : now;
            return `Year: ${format(yearDt, 'yyyy')}`;
        case 'custom':
            if (dateInfo.customStartDate && dateInfo.customEndDate) {
                return `Range: ${format(new Date(dateInfo.customStartDate), 'MMM dd, yyyy')} - ${format(new Date(dateInfo.customEndDate), 'MMM dd, yyyy')}`;
            }
            return 'All Time';
        case 'all':
        default:
            return 'All Time';
    }
};

// --- AttendedAppointments Component ---
export function AttendedAppointments() {
  const { role } = useUser()
  const today = format(new Date(), "yyyy-MM-dd")
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  
  const [dateFilter, setDateFilter] = useState(role === "staff" ? "today" : "all")
  const [specificDate, setSpecificDate] = useState(role === "staff" ? today : "")
  
  const [weekDate, setWeekDate] = useState("")
  const [monthDate, setMonthDate] = useState("")
  const [yearDate, setYearDate] = useState("")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isCustomRangeModalOpen, setIsCustomRangeModalOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editData, setEditData] = useState<AppointmentWithPaymentFields | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingDPR, setIsSendingDPR] = useState(false)
  
  const [doctorOptions, setDoctorOptions] = useState<string[]>([])
  const [serviceOptions, setServiceOptions] = useState<string[]>([])
  
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const monthInputRef = useRef<HTMLInputElement>(null)
  const dprReportRef = useRef<HTMLDivElement>(null); // New ref for the hidden report

  const getPaidAmount = (apt: Appointment) => {
    if (apt.payment) {
      return (apt.payment.cashAmount || 0) + (apt.payment.onlineAmount || 0)
    }
    return (apt.cashAmount || 0) + (apt.onlineAmount || 0)
  }

  // --- UPDATED: applyFilters now uses role from component scope ---
  const applyFilters = (
    appointmentsList: Appointment[],
    search: string,
    filter: string,
    specDate?: string,
    weekDt?: string,
    monthDt?: string,
    yearDt?: string,
    customStart?: string,
    customEnd?: string,
  ) => {
    let filtered = appointmentsList
    const now = new Date()

    // --- UPDATED: Logic is now driven by the 'role' const ---
    if (role === "staff") {
      // Staff role is strictly filtered to today
      const todayStr = format(now, "yyyy-MM-dd");
      filtered = filtered.filter((apt) => {
          const aptDate = new Date(apt.appointmentDate);
          if (!isValid(aptDate)) return false;
          return format(aptDate, "yyyy-MM-dd") === todayStr;
      });
    } else {
      // Other roles can use the date filter
      switch (filter) {
        case "today":
          const targetDate = specDate ? new Date(`${specDate}T00:00:00`) : now;
          if (isValid(targetDate)) {
            filtered = filtered.filter((apt) => {
              const appointmentDate = new Date(apt.appointmentDate)
              return appointmentDate >= startOfDay(targetDate) && appointmentDate <= endOfDay(targetDate)
            })
          }
          break
        case "week":
          const targetWeekDate = weekDt ? new Date(`${weekDt}T00:00:00`) : now
          if (isValid(targetWeekDate)) {
            filtered = filtered.filter((apt) => {
              const appointmentDate = new Date(apt.appointmentDate)
              return appointmentDate >= startOfWeek(targetWeekDate) && appointmentDate <= endOfWeek(targetWeekDate)
            })
          }
          break
        case "month":
          const targetMonthDate = monthDt ? new Date(`${monthDt}-01T00:00:00`) : now
          if (isValid(targetMonthDate)) {
            filtered = filtered.filter((apt) => {
              const appointmentDate = new Date(apt.appointmentDate)
              return appointmentDate >= startOfMonth(targetMonthDate) && appointmentDate <= endOfMonth(targetMonthDate)
            })
          }
          break
        case "year":
          const targetYearDate = yearDt ? new Date(`${yearDt}-01-01T00:00:00`) : now
          if (isValid(targetYearDate)) {
            filtered = filtered.filter((apt) => {
              const appointmentDate = new Date(apt.appointmentDate)
              return appointmentDate >= startOfYear(targetYearDate) && appointmentDate <= endOfYear(targetYearDate)
            })
          }
          break
        case "custom":
          if (customStart && customEnd) {
            const startDate = new Date(`${customStart}T00:00:00`)
            const endDate = new Date(`${customEnd}T00:00:00`)
            if (isValid(startDate) && isValid(endDate)) {
              filtered = filtered.filter((apt) => {
                const appointmentDate = new Date(apt.appointmentDate)
                return appointmentDate >= startOfDay(startDate) && appointmentDate <= endOfDay(endDate)
              })
            }
          }
          break
        default:
          // "all" filter, no date filtering
          break
      }
    }

    if (search) {
      filtered = filtered.filter((apt) => apt.patientName.toLowerCase().includes(search.toLowerCase()))
    }
    
    // Sort by creation date descending
    filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    setFilteredAppointments(filtered)
  }

  // --- UPDATED: useEffect now depends on 'role' and 'today' ---
  useEffect(() => {
    const unsubscribe = subscribeToAppointments((data) => {
      const attendedAppointments = data.filter((apt) => apt.status === "completed")
      setAppointments(attendedAppointments) // Store all attended
      
      // Enforce "today" filter if role is "staff"
      const effectiveDateFilter = role === "staff" ? "today" : dateFilter;
      const effectiveSpecificDate = role === "staff" ? today : specificDate;
      
      applyFilters(
        attendedAppointments, // Filter from all attended
        searchTerm,
        effectiveDateFilter,
        effectiveSpecificDate,
        weekDate,
        monthDate,
        yearDate,
        customStartDate,
        customEndDate,
      )
    })

    return () => unsubscribe()
  }, [
    searchTerm, 
    dateFilter, 
    specificDate, 
    weekDate, 
    monthDate, 
    yearDate, 
    customStartDate, 
    customEndDate,
    role, // Added role
    today // Added today
  ])

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const doctors = await getDoctorOptionsFromDB()
        const services = await getServiceOptionsFromDB()
        setDoctorOptions(doctors)
        setServiceOptions(services)
      } catch (error) {
        console.error("Failed to fetch master doctor/service data:", error)
        setDoctorOptions([])
        setServiceOptions([])
      }
    }
    fetchMasterData()
  }, []) 

  const handleViewInvoice = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsInvoiceOpen(true)
  }

  const handleEdit = async (appointment: Appointment) => {
    let baseAppointment = appointment
    if (appointment.createdAt && appointment.id) {
      const createdDate = new Date(appointment.createdAt)
      const year = createdDate.getFullYear().toString()
      const month = (createdDate.getMonth() + 1).toString().padStart(2, "0")
      const day = createdDate.getDate().toString().padStart(2, "0")
      const appointments = await getAppointmentsByDate(year, month, day) 
      const latest = appointments.find((a) => a.id === appointment.id)
      if (latest) baseAppointment = latest
    }
    
    const editObj = { ...baseAppointment } as AppointmentWithPaymentFields
    if (baseAppointment.payment) {
      editObj.paymentMethod = baseAppointment.payment.paymentMethod
      editObj.cashAmount = baseAppointment.payment.cashAmount
      editObj.onlineAmount = baseAppointment.payment.onlineAmount
      editObj.discountAmount = baseAppointment.payment.discountAmount
      editObj.cashType = baseAppointment.payment.cashType
      editObj.onlineType = baseAppointment.payment.onlineType
    }
    if (!editObj.services) {
      editObj.services = []
    }

    setEditData(editObj)
    setIsEditOpen(true)
  }

  const handleEditChange = (field: keyof AppointmentWithPaymentFields, value: any) => {
    if (!editData) return
    setEditData({ ...editData, [field]: value })
  }

  const handleEditSave = async () => {
    if (!editData || !editData.id) return;
    setIsSaving(true)
    try {
      const payment = {
        paymentMethod: editData.paymentMethod || "",
        cashAmount: editData.cashAmount || 0,
        onlineAmount: editData.onlineAmount || 0,
        discountAmount: editData.discountAmount || 0,
        cashType: editData.cashType || "",
        onlineType: editData.onlineType || "",
        createdAt: editData.payment?.createdAt || new Date().toISOString(),
      }
      const { paymentMethod, cashAmount, onlineAmount, discountAmount, cashType, onlineType, ...rest } = editData
      
      await updateAppointment(editData.id, {
        ...rest,
        payment,
      })
      setIsEditOpen(false)
    } catch (e) {
      console.error("Failed to update appointment:", e);
      alert("Error: Could not save changes. Please try again.");
    } finally {
      setIsSaving(false)
    }
  }

  // --- UPDATED: Moved calculations to useMemo ---
  const dprStats = React.useMemo(() => {
    // Today's stats (uses filteredAppointments, which is already today's for staff)
    const totalRevenueToday = filteredAppointments.reduce((sum, apt) => sum + getPaidAmount(apt), 0);
    const totalAppointmentsToday = filteredAppointments.length;

    // Last 7 Days stats (uses the full 'appointments' list)
    const today = new Date();
    const sevenDaysAgo = startOfDay(subDays(today, 6)); 
    const todayEnd = endOfDay(today);

    const last7DaysAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      if (!isValid(aptDate)) return false;
      return aptDate >= sevenDaysAgo && aptDate <= todayEnd;
    });

    const totalRevenue7Days = last7DaysAppointments.reduce((sum, apt) => sum + getPaidAmount(apt), 0);
    const totalAppointments7Days = last7DaysAppointments.length;

    return {
      totalRevenueToday,
      totalAppointmentsToday,
      totalRevenue7Days,
      totalAppointments7Days,
      dprDate: format(new Date(), 'EEEE, MMMM dd, yyyy')
    };
  }, [appointments, filteredAppointments]);


  const getTotalAmount = () => {
    // This function can now just use the memoized value
    return dprStats.totalRevenueToday;
  }

  const resetDateInputs = () => {
    if (role !== 'staff') {
      setSpecificDate("")
    }
    setWeekDate("")
    setMonthDate("")
    setYearDate("")
    setCustomStartDate("")
    setCustomEndDate("")
  }

  const handleFilterChange = (value: string) => {
    setDateFilter(value)
    resetDateInputs()
    if (value === "custom") {
      setIsCustomRangeModalOpen(true)
    }
  }

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      setIsCustomRangeModalOpen(false)
    }
  }

  // --- NEW: Function to send DPR as Base64 Image ---
  const handleSendDPR = async () => {
    if (!dprReportRef.current) {
      alert("DPR template not found. Please refresh.");
      return;
    }
    setIsSendingDPR(true);

    try {
      // 1. Generate Canvas from the hidden div
      const canvas = await html2canvas(dprReportRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        backgroundColor: '#ffffff' // Ensure it has a white background
      });

      // 2. Get Base64 Image Data
      // We get the full Data URL first
      const dataUrl = canvas.toDataURL("image/png");
      
      // Extract raw base64 data by removing the prefix
      const base64Data = dataUrl.split(',')[1];

      if (!base64Data) {
        throw new Error("Failed to extract base64 data from canvas.");
      }

      // 3. Create Caption (as text fallback)
      const caption = `
*Dental Clinic - Daily Performance Report*
*Date:* ${dprStats.dprDate}

*TODAY'S VERIFICATION*
- *Total Attended:* ${dprStats.totalAppointmentsToday}
- *Total Revenue:* ₹${dprStats.totalRevenueToday.toLocaleString()}

*LAST 7 DAY PROGRESS*
- *Total Attended:* ${dprStats.totalAppointments7Days}
- *Total Revenue:* ₹${dprStats.totalRevenue7Days.toLocaleString()}

_This is an automated report._
      `;

      // 4. Create API Payload
      const payload = {
        number: "919958399157",
        mediatype: "image",
        mimetype: "image/png",
        caption: caption.trim(),
        media: base64Data, // Send the raw base64 data
        fileName: `DPR_${today}.png`
      };

      // 5. Send to API
      const response = await fetch("https://evo.infispark.in/message/sendMedia/medzeal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || ""
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("DPR Image sent successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send DPR Image");
      }
    } catch (error: any) {
      console.error("Error sending DPR Image:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSendingDPR(false);
    }
  };


  const filterDateInfo = {
    filter: dateFilter,
    specificDate,
    weekDate,
    monthDate,
    yearDate,
    customStartDate,
    customEndDate,
  };


  return (
    <div className="space-y-6 px-1 md:px-0 max-w-7xl mx-auto w-full">
      
      {/* --- NEW: Hidden DPR Report Div for html2canvas --- */}
      {/* This div is positioned off-screen and will be used to generate the image */}
      <div 
        ref={dprReportRef} 
        style={{
          position: 'absolute', 
          left: '-9999px', 
          top: 0, 
          width: '400px', 
          padding: '20px', 
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif',
          color: '#333'
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff', margin: 0 }}>
            Dental Clinic
          </h2>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '5px 0 0 0' }}>
            Daily Performance Report
          </h3>
          <p style={{ fontSize: '12px', color: '#555', margin: '5px 0 0 0' }}>
            {dprStats.dprDate}
          </p>
        </div>
        
        <div style={{ marginBottom: '15px', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            TODAY'S VERIFICATION
          </h4>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>Total Attended:</span> {dprStats.totalAppointmentsToday}
          </div>
          <div style={{ fontSize: '14px' }}>
            <span style={{ fontWeight: 'bold' }}>Total Revenue:</span> ₹{dprStats.totalRevenueToday.toLocaleString()}
          </div>
        </div>
        
        <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            LAST 7 DAY PROGRESS
          </h4>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>Total Attended:</span> {dprStats.totalAppointments7Days}
          </div>
          <div style={{ fontSize: '14px' }}>
            <span style={{ fontWeight: 'bold' }}>Total Revenue:</span> ₹{dprStats.totalRevenue7Days.toLocaleString()}
          </div>
        </div>

        <p style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '15px' }}>
          _This is an automated report._
        </p>
      </div>
      {/* --- End of Hidden DPR Div --- */}


      <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-teal-50 to-blue-50 rounded-3xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-teal-200 to-blue-200 rounded-2xl shadow-md">
                <CheckCircle className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl text-blue-900 font-extrabold tracking-tight">
                  Attended Appointments
                </CardTitle>
                <p className="text-blue-600 text-sm md:text-base font-medium">
                  {role === 'staff' ? "Viewing today's completed appointments" : "View completed appointments with advanced filtering"}
                </p>
              </div>
            </div>
            
            {role !== "staff" ? (
              <div className="flex flex-col sm:flex-row gap-3">
                 <div className="flex items-center gap-2 bg-gradient-to-r from-teal-100 to-blue-100 px-4 py-2 rounded-xl shadow-sm">
                    <TrendingUp className="h-5 w-5 text-teal-600" />
                    <div className="text-right">
                      <div className="text-xs md:text-sm text-teal-700 font-semibold">Total Revenue</div>
                      <div className="text-base md:text-lg font-bold text-blue-900">
                        {/* Use memoized value */}
                        ₹{dprStats.totalRevenueToday.toLocaleString()}
                      </div>
                    </div>
                  </div>
              </div>
            ) : (
              // --- "Send DPR" Button for staff ---
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSendDPR}
                  disabled={isSendingDPR}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-2"
                >
                  {isSendingDPR ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Today's DPR
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          {/* Search and Filter Controls */}
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
            
            {role !== "staff" && (
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
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {role !== "staff" && (
            <div className="flex flex-wrap gap-4 mt-4">
              {dateFilter === "today" && (
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
              {dateFilter === "week" && (
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
              {dateFilter === "month" && (
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
                      onClick={() =>
                        monthInputRef.current && monthInputRef.current.showPicker
                          ? monthInputRef.current.showPicker()
                          : monthInputRef.current?.focus()
                      }
                    >
                      <Calendar className="h-5 w-5" />
                    </button>
                  </div>
                  <span className="text-xs md:text-sm text-blue-500">Select month and year</span>
                </div>
              )}
              {dateFilter === "year" && (
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
                  <span className="text-xs md:text-sm text-blue-500">Enter year (e.g., 2025)</span>
                </div>
              )}
              {dateFilter === "custom" && customStartDate && customEndDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  <div className="flex items-center gap-2 bg-gradient-to-r from-white to-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                    <span className="text-xs md:text-sm text-blue-700 font-medium">
                      {format(new Date(customStartDate), "MMM dd, yyyy")} -{" "}
                      {format(new Date(customEndDate), "MMM dd, yyyy")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsCustomRangeModalOpen(true)}
                      className="text-xs px-2 py-1 h-6 border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(role === "staff" || (role !== "admin" && dateFilter !== "all")) && (
            <div className="mt-2 p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-blue-100">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                <div className="text-xs md:text-sm text-blue-700">
                    <strong>Active Filter:</strong> {getFilterDisplay(role === 'staff' ? 'today' : dateFilter, filterDateInfo)}
                </div>
                <div className="text-xs md:text-sm font-medium text-blue-600">
                  {filteredAppointments.length} appointment(s) found
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 shadow-lg">
            <table className="w-full border-collapse min-w-[1000px] text-xs md:text-sm">
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
                  <th className="text-left p-3 font-semibold text-blue-900">Note</th> 
                  <th className="text-left p-3 font-semibold text-blue-900">Paid Amount</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Status</th>
                  <th className="text-left p-3 font-semibold text-blue-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment, index) => (
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
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                          >
                            {service}
                          </Badge>
                        )) || "N/A"}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs md:text-sm">
                        <div>{appointment.appointmentDate}</div>
                        <div className="text-blue-500">{appointment.appointmentTime}</div>
                      </div>
                    </td>
                    <td className="p-3 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 text-xs" title={appointment.note}>
                      {appointment.note || 'N/A'}
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
            {filteredAppointments.length === 0 && (
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

      {/* Custom Range Modal */}
      <Dialog open={isCustomRangeModalOpen} onOpenChange={setIsCustomRangeModalOpen}>
        <DialogContent className="max-w-md bg-gradient-to-br from-white to-blue-50 border-0 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal-600" />
              Custom Date Range
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-2">Starting Date</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full border-blue-200 focus:border-teal-400 focus:ring-teal-300 rounded-xl bg-gradient-to-r from-white to-blue-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-2">Ending Date</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full border-blue-200 focus:border-teal-400 focus:ring-teal-300 rounded-xl bg-gradient-to-r from-white to-blue-50"
              />
            </div>
            {customStartDate && customEndDate && (
              <div className="p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-blue-100">
                <div className="text-xs text-blue-700">
                  <strong>Selected Range:</strong> {format(new Date(customStartDate), "PPP")} -{" "}
                  {format(new Date(customEndDate), "PPP")}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCustomRangeModalOpen(false)
                  setDateFilter("all")
                }}
                className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomRangeApply}
                disabled={!customStartDate || !customEndDate}
                className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-md"
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} appointment={selectedAppointment} />
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl bg-gradient-to-br from-white to-amber-50 border-0 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-amber-700 mb-2">Edit Appointment</DialogTitle>
          </DialogHeader>
          {editData && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                handleEditSave()
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                  <Input
                    className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400"
                    value={editData.patientName || ''}
                    onChange={(e) => handleEditChange("patientName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <Input
                    type="number"
                    className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400"
                    value={editData.age || ''}
                    onChange={(e) => handleEditChange("age", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <Input
                    className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400"
                    value={editData.gender || ''}
                    onChange={(e) => handleEditChange("gender", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <Input
                    className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400"
                    value={editData.contactNumber || ''}
                    onChange={(e) => handleEditChange("contactNumber", e.target.value)}
                  />
                </div>
              </div>
              {/* Doctor Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select
                  className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400"
                  value={editData.doctor || ""}
                  onChange={(e) => handleEditChange("doctor", e.target.value)}
                >
                  <option value="">Select doctor</option>
                  {doctorOptions.map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>
              {/* Services Multi-Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Services (Multiple selection allowed)
                </label>
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setIsServicesOpen(!isServicesOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 ${!editData.services?.length ? "border-amber-300" : "border-amber-400"}`}
                  >
                    <span className="text-gray-700">
                      {editData.services?.length === 0
                        ? "Select services..."
                        : `${editData.services?.length || 0} service(s) selected`}
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
                              onChange={(e) => {
                                let updated = editData.services ? [...editData.services] : []
                                if (e.target.checked) {
                                  updated.push(service)
                                } else {
                                  updated = updated.filter((s) => s !== service)
                                }
                                handleEditChange("services", updated)
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
                      <span
                        key={service}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Note Field in Edit Dialog */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note for Doctor (Optional)</label>
                <textarea
                  className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:ring-amber-400 focus:border-amber-400"
                  value={editData.note || ""}
                  onChange={(e) => handleEditChange("note", e.target.value)}
                  placeholder="Enter notes here..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <Select
                  value={editData.paymentMethod || ""}
                  onValueChange={(val) => handleEditChange("paymentMethod", val)}
                >
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
              {(editData.paymentMethod === "cash" || editData.paymentMethod === "cash+online") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                  <Input
                    type="number"
                    value={editData.cashAmount || ''}
                    onChange={(e) => handleEditChange("cashAmount", Number(e.target.value))}
                    placeholder="Enter cash amount"
                    className="border-amber-300 focus:border-amber-500"
                  />
                </div>
              )}
              {(editData.paymentMethod === "online" || editData.paymentMethod === "cash+online") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Online Amount</label>
                  <Input
                    type="number"
                    value={editData.onlineAmount || ''}
                    onChange={(e) => handleEditChange("onlineAmount", Number(e.target.value))}
                    placeholder="Enter online amount"
                    className="border-amber-300 focus:border-amber-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                <Input
                  type="number"
                  value={editData.discountAmount || ''}
                  onChange={(e) => handleEditChange("discountAmount", Number(e.target.value))}
                  placeholder="Enter discount amount"
                  className="border-amber-300 focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditOpen(false)}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}