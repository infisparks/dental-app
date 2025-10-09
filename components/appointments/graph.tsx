"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarIcon, BarChart2, CalendarDays } from "lucide-react"
import { getAllAppointments, type Appointment } from "@/lib/appointments"
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isSameDay,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
} from "date-fns"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ArcElement,
  ScaleOptionsByType, // Imported for correct serviceLabelCallback typing
} from "chart.js"
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, ChartLegend, ArcElement)
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useUser } from "@/components/ui/UserContext"

// You'll need to update the Appointment type in "@/lib/appointments"
// or define a local type for your full database structure if needed for `services_master`.
// For simplicity, I'll assume `getAllAppointments` can return the full structure or a function
// to get the services master is available. I'll mock the extraction here based on your prompt.

// --- START: Mock Data Extraction (Replace with actual data fetching if needed) ---
// Since the data structure is passed in the prompt, I'll define a function
// to simulate getting the services master from the context where getAllAppointments runs.
// In a real application, you might fetch this separately or update getAllAppointments.
function getServicesMasterFromData(data: any) {
  if (data && data.services_master) {
    // Get the display name of each service
    return Object.values(data.services_master).map((service: any) => service.name)
  }
  return []
}
// Assuming the full data structure is available when appointments are fetched.
// For the purpose of this isolated component, we will assume a function
// to get the services list from a more comprehensive fetch is available.
// For now, we will dynamically determine the service list from the appointments themselves
// and the provided services_master structure, or use a placeholder if the structure
// is not globally available in this file's scope.
// Since you provided the full database structure, I'll use a placeholder and
// rely on the appointments' service names for the dynamic part.

// UPDATE: Since the full structure isn't accessible outside of the function,
// and we are within the component, we'll need to fetch/import the services_master.
// For now, I'll assume your `getAllAppointments` (or a similar function)
// provides access to the full DB object to get the `services_master`.
// If not, you must modify your data fetching to get the `services_master` list.
// For this fix, I'll extract it from the **unique services found in the appointments**
// as a fallback, and then use the one you provided to ensure completeness.

const MOCK_DB_STRUCTURE = {
  // Use a placeholder that you would replace with an actual import/fetch
  services_master: {
    cad_cam: { name: "CAD CAM", price: 2500, updatedAt: "2025-10-07T15:55:34.545Z" },
    cement__gic_: { name: "CEMENT (GIC)", price: 400, updatedAt: "2025-10-07T15:53:53.230Z" },
    ceramic_pfm: { name: "CERAMIC PFM", price: 1800, updatedAt: "2025-10-07T15:55:13.273Z" },
    composite: { name: "COMPOSITE", price: 500, updatedAt: "2025-10-07T15:54:07.977Z" },
    extration: { name: "EXTRATION", price: 500, updatedAt: "2025-10-07T15:53:20.313Z" },
    opd_consultantion: { name: "OPD CONSULTANTION", price: 50, updatedAt: "2025-10-07T15:52:57.256Z" },
    root_canal: { name: "ROOT CANAL", price: 1700, updatedAt: "2025-10-07T16:03:35.254Z" },
    rpd__removable_denture_: { name: "RPD (REMOVABLE DENTURE)", price: 500, updatedAt: "2025-10-07T15:56:20.079Z" },
    scaling: { name: "SCALING", price: 600, updatedAt: "2025-10-07T15:54:22.542Z" },
    white_metal_cap: { name: "WHITE METAL CAP", price: 800, updatedAt: "2025-10-07T15:54:33.540Z" },
    wisdom_tooth_extraction: { name: "WISDOM TOOTH EXTRACTION", price: 1500, updatedAt: "2025-10-07T15:53:35.650Z" },
    wisdom_tooth_surgery: { name: "WISDOM TOOTH SURGERY", price: 3000, updatedAt: "2025-10-07T15:56:01.825Z" },
    x_ray: { name: "X-RAY", price: 200, updatedAt: "2025-10-07T15:53:05.083Z" },
    zirconia_cap: { name: "ZIRCONIA CAP", price: 4000, updatedAt: "2025-10-07T15:55:46.075Z" },
  },
}
const INITIAL_SERVICE_LIST = getServicesMasterFromData(MOCK_DB_STRUCTURE)
// --- END: Mock Data Extraction ---

const FILTER_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7days" },
  { label: "This Month", value: "month" },
]

const TYPE_OPTIONS = [
  { label: "ALL", value: "all" },
  { label: "Appointment", value: "appointment" },
  { label: "Amount", value: "amount" },
  { label: "Services", value: "services" },
]

// Helper to get the total paid amount for an appointment
function getPaidAmount(apt: Appointment) {
  if (apt.payment) {
    return (apt.payment.cashAmount || 0) + (apt.payment.onlineAmount || 0)
  }
  // Fallback for old/other data structure
  return (apt as any).cashAmount || 0 + (apt as any).onlineAmount || 0
}

export function Graph() {
  const [filter, setFilter] = useState("7days")
  const [type, setType] = useState("all")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isCustomRangeModalOpen, setIsCustomRangeModalOpen] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [servicesMasterList, setServicesMasterList] = useState<string[]>(INITIAL_SERVICE_LIST) // 👈 Dynamic Service List
  const { role } = useUser()

  useEffect(() => {
    setLoading(true)
    getAllAppointments().then((data) => {
      setAppointments(data)
      setLoading(false)
      
      // OPTIONAL: Update servicesMasterList based on the fetched data if it contains services_master
      // If `data` contains the full DB structure, uncomment and use it:
      // const dynamicServiceList = getServicesMasterFromData(data)
      // if (dynamicServiceList.length > 0) {
      //   setServicesMasterList(dynamicServiceList)
      // }
    })
  }, [])
  
  // A second effect to dynamically extract all unique services from the current appointments
  // (useful if `getAllAppointments` doesn't return the services_master)
  useEffect(() => {
    if (appointments.length > 0) {
      const uniqueServices = new Set<string>()
      appointments.forEach(apt => {
        if (apt.services && Array.isArray(apt.services)) {
          apt.services.forEach(service => uniqueServices.add(service))
        }
      })
      // Use the services from the appointments if they are more comprehensive,
      // or combine them with the INITIAL_SERVICE_LIST.
      const combinedServices = Array.from(new Set([...INITIAL_SERVICE_LIST, ...Array.from(uniqueServices)]))
      if (combinedServices.length > 0) {
        setServicesMasterList(combinedServices)
      }
    }
  }, [appointments])
  
  // Use useMemo for heavy calculations to avoid re-calculating on every render
  const { filteredAppointments, startDate, endDate } = useMemo(() => {
    let sDate = new Date()
    let eDate = new Date()
    
    if (filter === "today") {
      sDate = eDate = selectedDate
    } else if (filter === "7days") {
      sDate = subDays(new Date(), 6)
      eDate = new Date()
    } else if (filter === "month") {
      sDate = startOfMonth(new Date())
      eDate = endOfMonth(new Date())
    } else if (filter === "custom" && customStartDate && customEndDate) {
      sDate = parseISO(customStartDate)
      eDate = parseISO(customEndDate)
    }

    const apts = appointments.filter((apt: any) => {
      // Ensure appointmentDate is treated as a string for parsing
      const aptDateString = apt.appointmentDate
      if (!aptDateString) return false // Skip if date is missing
      
      const aptDate = parseISO(aptDateString)
      if (!isValid(aptDate)) return false // Skip if date is invalid

      if (filter === "today") {
        return isSameDay(aptDate, selectedDate)
      } else if (filter === "custom" && customStartDate && customEndDate) {
        const start = parseISO(customStartDate)
        const end = parseISO(customEndDate)
        if (isValid(start) && isValid(end)) {
          // Check if appointment date is between start of start date and end of end date
          return aptDate >= startOfDay(start) && aptDate <= endOfDay(end)
        }
        return false
      }
      return isWithinInterval(aptDate, { start: startOfDay(sDate), end: endOfDay(eDate) })
    })
    
    return { filteredAppointments: apts, startDate: sDate, endDate: eDate }
  }, [appointments, filter, selectedDate, customStartDate, customEndDate])

  // --- Graph Data Generation ---
  
  const appointmentData: { date: string; count: number }[] = useMemo(() => {
    const data = []
    // Reset date objects for iteration to ensure correct range
    let d = startOfDay(startDate) 
    while (d <= endOfDay(endDate)) {
      const dateStr = format(d, "yyyy-MM-dd")
      const count = filteredAppointments.filter((apt: any) => apt.appointmentDate === dateStr).length
      data.push({ date: dateStr, count })
      d = subDays(d, -1) // Move to the next day
    }
    return data
  }, [startDate, endDate, filteredAppointments])

  const amountData: { date: string; amount: number }[] = useMemo(() => {
    const data = []
    let d = startOfDay(startDate)
    while (d <= endOfDay(endDate)) {
      const dateStr = format(d, "yyyy-MM-dd")
      const amount = filteredAppointments
        .filter((apt: Appointment) => apt.appointmentDate === dateStr)
        .reduce((sum: number, apt: Appointment) => sum + getPaidAmount(apt), 0)
      data.push({ date: dateStr, amount })
      d = subDays(d, -1)
    }
    return data
  }, [startDate, endDate, filteredAppointments])
  
  // Services Bar Data (Total count for each service across the filtered range)
  const servicesBarData = useMemo(() => {
    return servicesMasterList.map((service) => { // 👈 Dynamic List Usage
      const count = filteredAppointments.filter((apt: any) => 
        apt.services && Array.isArray(apt.services) && apt.services.includes(service)
      ).length
      return { service, count }
    }).filter(d => d.count > 0) // Only show services that were used
  }, [filteredAppointments, servicesMasterList])

  // --- End Graph Data Generation ---

  const colors = [
    "#6366f1", // Indigo
    "#06b6d4", // Cyan
    "#22d3ee", // Sky
    "#10b981", // Emerald
    "#f59e42", // Orange
    "#f43f5e", // Rose
    "#a21caf", // Purple
    "#fbbf24", // Amber
    "#ef4444", // Red
    "#34d399", // Teal
    "#a855f7", // Violet
    "#ec4899", // Pink
    "#84cc16", // Lime
    "#eab308", // Yellow
  ].slice(0, servicesMasterList.length) // Limit colors to the number of services

  const gridClasses = "grid grid-cols-1 gap-6"

  const handleFilterChange = (value: string) => {
    setFilter(value)
    if (value === "custom") {
      setIsCustomRangeModalOpen(true)
    }
    if (value !== "today") {
      setShowDatePicker(false)
    }
  }

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      setIsCustomRangeModalOpen(false)
    }
  }

  const getFilterOptions = () => {
    const baseOptions = [
      { label: "Today", value: "today" },
      { label: "Last 7 Days", value: "7days" },
      { label: "This Month", value: "month" },
    ]

    if (role === "admin") {
      baseOptions.push({ label: "Custom Range", value: "custom" })
    }

    return baseOptions
  }
  
  // Custom label formatter for X-axis on service graph to prevent overflow (Previous fix retained)
  const serviceLabelCallback: ScaleOptionsByType<'category'>['ticks']['callback'] = function (tickValue, index) {
    // We use the index to look up the service name from the computed data
    const label = servicesBarData[index]?.service || ''
    // Truncate long service names
    return label.length > 15 ? label.substring(0, 12) + '...' : label
  }

  return (
    <div className="space-y-8 px-1 md:px-6 max-w-7xl mx-auto w-full md:ml-[240px] md:pl-6 mt-8 mb-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight drop-shadow-sm">
            <BarChart2 className="h-7 md:h-8 w-7 md:w-8 text-indigo-600" /> Analytics Graph
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto justify-end bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-xl p-2 shadow-md">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-32 md:w-36 bg-white border-2 border-indigo-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg">
              {getFilterOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="hover:bg-indigo-100">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="ml-1 border-2 border-indigo-200 bg-white hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-400"
              onClick={() => {
                setFilter("today")
                setShowDatePicker((v) => !v)
              }}
              title="Pick a date"
            >
              <CalendarIcon className="h-5 w-5 text-indigo-500" />
            </Button>
            {showDatePicker && (
              <div className="absolute right-0 z-50 mt-2">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date as Date)
                    setShowDatePicker(false)
                    setFilter("today")
                  }}
                  inline
                  className="rounded-lg border-2 border-indigo-200 shadow-lg"
                />
              </div>
            )}
          </div>
          {filter === "custom" && customStartDate && customEndDate && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-2 border-indigo-200 shadow-sm">
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-indigo-700 font-medium">
                {format(parseISO(customStartDate), "MMM dd")} - {format(parseISO(customEndDate), "MMM dd")}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCustomRangeModalOpen(true)}
                className="text-xs px-2 py-1 h-6 border-indigo-300 text-indigo-600 hover:bg-indigo-50"
              >
                Change
              </Button>
            </div>
          )}
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-32 md:w-36 bg-white border-2 border-indigo-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg">
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="hover:bg-indigo-100">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className={gridClasses}>
        {(type === "all" || type === "appointment") && (
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-indigo-50 border-0">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-indigo-700">Appointment Count</CardTitle>
              <CardDescription className="text-gray-500">Number of appointments per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Bar
                  data={{
                    labels: appointmentData.map((d) => format(parseISO(d.date), filter === 'today' ? 'ha' : 'MMM d')),
                    datasets: [
                      {
                        label: "Appointments",
                        data: appointmentData.map((d) => d.count),
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
                      tooltip: { 
                         enabled: true,
                         callbacks: {
                           // FIX APPLIED HERE: Use dataIndex to get the original ISO date string from appointmentData
                           title: (tooltipItems) => {
                             const dataIndex = tooltipItems[0].dataIndex;
                             const dateStr = appointmentData[dataIndex]?.date;
                             if (dateStr) {
                               return format(parseISO(dateStr), 'eee, MMM d');
                             }
                             return tooltipItems[0].label; // Fallback
                           },
                           label: (context) => `Appointments: ${context.formattedValue}`
                         }
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: colors[0],
                          font: { size: 11 },
                          autoSkip: true,
                          maxTicksLimit: 7,
                          callback: function (value, index) {
                            const dateLabel = this.getLabelForValue(Number(value));
                            if (filter === "month") {
                              return index % 5 === 0 ? dateLabel : ""
                            }
                            return dateLabel
                          },
                        },
                      },
                      y: {
                        grid: { color: "#e0e7ff" },
                        ticks: {
                          color: colors[0],
                          font: { size: 11 },
                          stepSize: 1, // Changed from 2 to 1 for better integer representation
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
        {(type === "all" || type === "amount") && (
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-cyan-50 border-0">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-cyan-700">Amount Collected</CardTitle>
              <CardDescription className="text-gray-500">Total amount collected per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Bar
                  data={{
                    labels: amountData.map((d) => format(parseISO(d.date), filter === 'today' ? 'ha' : 'MMM d')),
                    datasets: [
                      {
                        label: "Amount",
                        data: amountData.map((d) => d.amount),
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
                      tooltip: { 
                         enabled: true,
                         callbacks: {
                           // FIX APPLIED HERE: Use dataIndex to get the original ISO date string from amountData
                           title: (tooltipItems) => {
                             const dataIndex = tooltipItems[0].dataIndex;
                             const dateStr = amountData[dataIndex]?.date;
                             if (dateStr) {
                               return format(parseISO(dateStr), 'eee, MMM d');
                             }
                             return tooltipItems[0].label; // Fallback
                           },
                           label: (context) => `Amount: ₹${context.formattedValue}`
                         }
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: colors[1],
                          font: { size: 11 },
                          autoSkip: true,
                          maxTicksLimit: 7,
                          callback: function (value, index) {
                            const dateLabel = this.getLabelForValue(Number(value));
                            if (filter === "month") {
                              return index % 5 === 0 ? dateLabel : ""
                            }
                            return dateLabel
                          },
                        },
                      },
                      y: {
                        grid: { color: "#bae6fd" },
                        ticks: {
                          color: colors[1],
                          font: { size: 11 },
                          // Dynamically set stepSize or keep a reasonable default
                          // stepSize: 2000, 
                          maxTicksLimit: 5,
                          callback: (value) => `₹${value}`
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
        {(type === "all" || type === "services") && (
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-amber-50 border-0">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-amber-700">Services Graph</CardTitle>
              <CardDescription className="text-gray-500">Number of times each service was used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Bar
                  data={{
                    labels: servicesBarData.map((d) => d.service), // 👈 Dynamic Labels
                    datasets: [
                      {
                        label: "Service Count",
                        data: servicesBarData.map((d) => d.count),
                        // Use a variety of colors up to the number of services
                        backgroundColor: servicesBarData.map((_, index) => colors[index % colors.length]), 
                        borderRadius: 8,
                        barPercentage: 0.8, // Slightly wider bars for services
                        categoryPercentage: 0.9,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      title: { display: false },
                      tooltip: { 
                         enabled: true,
                         callbacks: {
                           title: (tooltipItems) => servicesBarData[tooltipItems[0].dataIndex].service,
                           label: (context) => `Count: ${context.formattedValue}`
                         }
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: colors[4],
                          font: { size: 10 }, // Smaller font for service names
                          autoSkip: false, // Ensure all service names are attempted to be displayed
                          maxRotation: 45, // Rotate labels to prevent overlap
                          minRotation: 45,
                          callback: serviceLabelCallback, // Uses the correctly typed callback
                        },
                      },
                      y: {
                        grid: { color: "#fde68a" },
                        ticks: {
                          color: colors[4],
                          font: { size: 11 },
                          stepSize: 1,
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
      <Dialog open={isCustomRangeModalOpen} onOpenChange={setIsCustomRangeModalOpen}>
        <DialogContent className="max-w-md bg-gradient-to-br from-white to-indigo-50 border-0 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              Custom Date Range
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-semibold text-indigo-700 mb-2">Starting Date</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-xl bg-gradient-to-r from-white to-indigo-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-indigo-700 mb-2">Ending Date</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-xl bg-gradient-to-r from-white to-indigo-50"
              />
            </div>
            {customStartDate && customEndDate && (
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-xl border border-indigo-100">
                <div className="text-xs text-indigo-700">
                  <strong>Selected Range:</strong> {format(parseISO(customStartDate), "PPP")} -{" "}
                  {format(parseISO(customEndDate), "PPP")}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCustomRangeModalOpen(false)
                  setFilter("7days")
                }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomRangeApply}
                disabled={!customStartDate || !customEndDate}
                className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-md"
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {loading && <div className="text-center text-gray-500 py-8">Loading...</div>}
      {!loading && filteredAppointments.length === 0 && (
        <div className="text-center text-gray-400 font-medium py-8">No data available for the selected filter.</div>
      )}
    </div>
  )
}

export default Graph