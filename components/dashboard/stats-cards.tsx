"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { subscribeToAppointments, type Appointment } from "@/lib/appointments"
import { Calendar, DollarSign, XCircle, CalendarDays, FileText } from "lucide-react"
import {
  format,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  startOfDay,
  endOfDay,
  isValid,
  subDays,
} from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// --- PDF IMPORTS ---
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// -------------------

const getFilters = (userRole: string) => {
  const baseFilters = [
    { label: "Last 7 Days", value: "last7days" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ]

  if (userRole === "admin") {
    baseFilters.push({ label: "Custom Range", value: "custom" })
  }

  return baseFilters
}


export function StatsCards() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filter, setFilter] = useState("last7days")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isCustomRangeModalOpen, setIsCustomRangeModalOpen] = useState(false)
  const [userRole, setUserRole] = useState("admin")
  const [isExporting, setIsExporting] = useState(false) 

  useEffect(() => {
    const unsubscribe = subscribeToAppointments((data) => {
      setAppointments(data)
    })
    return () => unsubscribe()
  }, [])

  const handleFilterChange = (value: string) => {
    setFilter(value)
    if (value === "custom") {
      setIsCustomRangeModalOpen(true)
    } else {
      setCustomStartDate("")
      setCustomEndDate("")
    }
  }

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setFilter("custom")
      setIsCustomRangeModalOpen(false)
    }
  }

  // Helper to get paid amounts
  const getPaid = (apt: Appointment) => {
    if (apt.payment) {
      return {
        cash: apt.payment.cashAmount || 0,
        online: apt.payment.onlineAmount || 0,
      }
    }
    return {
      cash: apt.cashAmount || 0,
      online: apt.onlineAmount || 0,
    }
  }

  // Filter appointments by selected filter
  const today = new Date()
  let filteredAppointments = appointments

  let currentStartDate: Date | null = null
  let currentEndDate: Date | null = null

  if (filter === "today") {
    currentStartDate = startOfDay(today)
    currentEndDate = endOfDay(today)
  } else if (filter === "last7days") {
    currentStartDate = startOfDay(subDays(today, 6))
    currentEndDate = endOfDay(today)
  } else if (filter === "week") {
    currentStartDate = startOfWeek(today, { weekStartsOn: 1 })
    currentEndDate = endOfWeek(today, { weekStartsOn: 1 })
  } else if (filter === "month") {
    currentStartDate = startOfMonth(today)
    currentEndDate = endOfMonth(today)
  } else if (filter === "custom" && customStartDate && customEndDate) {
    const start = parseISO(customStartDate)
    const end = parseISO(customEndDate)
    if (isValid(start) && isValid(end)) {
      currentStartDate = startOfDay(start)
      currentEndDate = endOfDay(end)
    }
  }

  // Apply the date range filtering
  if (currentStartDate && currentEndDate) {
    filteredAppointments = appointments.filter((apt) => {
      if (!apt.appointmentDate) return false
      const aptDate = parseISO(apt.appointmentDate)
      return isWithinInterval(aptDate, { start: currentStartDate!, end: currentEndDate! })
    })
  }

  // Calculate totals
  const totalCash = filteredAppointments.reduce((sum, apt) => sum + getPaid(apt).cash, 0)
  const totalOnline = filteredAppointments.reduce((sum, apt) => sum + getPaid(apt).online, 0)
  const totalAmount = totalCash + totalOnline
  const totalAppointments = filteredAppointments.length

  const handleClearFilters = () => {
    setFilter("last7days")
    setCustomStartDate("")
    setCustomEndDate("")
  }

  // --- PDF EXPORT LOGIC ---
  const handleExportToPDF = async () => {
    setIsExporting(true);
    // Use 'pt' unit (points) for precise control over A4 dimensions
    const pdf = new jsPDF('p', 'pt', 'a4'); 

    // A4 dimensions in points
    const a4Width = 595.28;
    const a4Height = 841.89;
    const letterheadImage = '/letterhead.png';
    
    // --- OFFSETS AND MARGINS ---
    const topOffsetPt = 180; 
    const margin = 20; 
    const printableWidth = a4Width - (2 * margin);
    const printableHeight = a4Height - topOffsetPt - (2 * margin); 

    // 1. Determine the filter label and date range
    let filterLabel = getFilters(userRole).find(f => f.value === filter)?.label || 'Custom Range';
    let dateRange = '';
    if (currentStartDate && currentEndDate) {
      dateRange = `${format(currentStartDate, "MMM dd, yyyy")} to ${format(currentEndDate, "MMM dd, yyyy")}`;
    }

    // 2. Create a temporary element to render the content for html2canvas
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    // CRITICAL FIX: Ensure the main container for html2canvas has a white background
    tempDiv.style.backgroundColor = '#ffffff'; 
    document.body.appendChild(tempDiv);

    // --- PROFESSIONAL HTML CONTENT WITH FINAL STYLING AND LAYOUT ---
    const reportContentHtml = `
      <div style="padding: 0; margin: 0; font-family: Arial, Helvetica, sans-serif; color: #333333; width: ${printableWidth}pt; background-color: #ffffff;">
        
        <h1 style="font-size: 14pt; font-weight: bold; margin-bottom: 10pt; color: #1f2937; text-align: center;">
          Appointment Details Report
        </h1>
        <div style="font-size: 9pt; margin-bottom: 15pt; color: #4b5563; border-bottom: 1px solid #cccccc; padding-bottom: 5pt; text-align: center; background-color: #ffffff;">
          <strong>Filter:</strong> ${filterLabel} | 
          <strong>Range:</strong> ${dateRange} | 
          <strong>Generated:</strong> ${format(new Date(), 'dd MMM yyyy HH:mm')}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 20pt; border: 1px solid #cccccc; background-color: #ffffff;">
          <thead>
            <tr style="background-color: #f8f8f8;">
              <th style="padding: 6pt 5pt; text-align: left; border-right: 1px solid #cccccc; color: #000000; font-weight: bold; width: 5%;">#</th>
              <th style="padding: 6pt 5pt; text-align: left; border-right: 1px solid #cccccc; color: #000000; font-weight: bold; width: 20%;">Patient</th>
              <th style="padding: 6pt 5pt; text-align: left; border-right: 1px solid #cccccc; color: #000000; font-weight: bold; width: 15%;">Date</th>
              <th style="padding: 6pt 5pt; text-align: left; border-right: 1px solid #cccccc; color: #000000; font-weight: bold; width: 10%;">Time</th>
              <th style="padding: 6pt 5pt; text-align: right; border-right: 1px solid #cccccc; color: #000000; font-weight: bold; width: 15%;">Cash</th>
              <th style="padding: 6pt 5pt; text-align: right; border-right: 1px solid #cccccc; color: #000000; font-weight: bold; width: 15%;">Online</th>
              <th style="padding: 6pt 5pt; text-align: left; color: #000000; font-weight: bold; width: 20%;">Status</th>
            </tr>
          </thead>
          <tbody>
          ${filteredAppointments.length === 0 ? `
            <tr>
              <td colSpan="7" style="text-align: center; padding: 10pt; color: #9a9a9a; border-top: 1px solid #cccccc; background-color: #ffffff;">
                No appointments found for this filter.
              </td>
            </tr>
          ` : (
            filteredAppointments.map((apt, idx) => {
              const paid = getPaid(apt);
              const cellBorder = '1px solid #dddddd';

              return `
                <tr style="background-color: #ffffff;">
                  <td style="padding: 5pt; border-right: ${cellBorder}; border-top: ${cellBorder}; color: #333333;">${idx + 1}</td>
                  <td style="padding: 5pt; border-right: ${cellBorder}; border-top: ${cellBorder}; color: #333333; font-weight: bold;">${apt.patientName}</td>
                  <td style="padding: 5pt; border-right: ${cellBorder}; border-top: ${cellBorder}; color: #333333;">${apt.appointmentDate}</td>
                  <td style="padding: 5pt; border-right: ${cellBorder}; border-top: ${cellBorder}; color: #333333;">${apt.appointmentTime}</td>
                  <td style="padding: 5pt; text-align: right; border-right: ${cellBorder}; border-top: ${cellBorder}; color: #059669; font-weight: bold;">₹${paid.cash.toLocaleString()}</td>
                  <td style="padding: 5pt; text-align: right; border-right: ${cellBorder}; border-top: ${cellBorder}; color: #1d4ed8; font-weight: bold;">₹${paid.online.toLocaleString()}</td>
                  <td style="padding: 5pt; border-top: ${cellBorder}; color: ${apt.status === "completed" ? '#059669' : '#9a3412'}; font-weight: bold;">
                    ${apt.status ? apt.status.charAt(0).toUpperCase() + apt.status.slice(1) : "Unknown"}
                  </td>
                </tr>
              `;
            }).join('')
          )}
          </tbody>
        </table>

        <h2 style="font-size: 14pt; font-weight: bold; margin: 20pt 0 10pt 0; color: #374151; text-align: center;">
          Appointment Statistics Report
        </h2>
        <table style="width: 100%; max-width: 400pt; margin: 0 auto; border-collapse: collapse; font-size: 9pt; border: 1px solid #cccccc; background-color: #ffffff;">
          <tbody>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 8pt; border-bottom: 1px solid #cccccc; font-weight: bold; width: 25%;">Total Appointments</td>
              <td style="padding: 8pt; text-align: right; border-bottom: 1px solid #cccccc; width: 25%;">
                ${totalAppointments}
              </td>
              <td style="padding: 8pt; border-bottom: 1px solid #cccccc; font-weight: bold; width: 25%;">Total Cash Collected</td>
              <td style="padding: 8pt; text-align: right; border-bottom: 1px solid #cccccc; width: 25%;">
                ₹${totalCash.toLocaleString()}
              </td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="padding: 8pt; border-bottom: 1px solid #cccccc; font-weight: bold;">Total Online Collected</td>
              <td style="padding: 8pt; text-align: right; border-bottom: 1px solid #cccccc;">
                ₹${totalOnline.toLocaleString()}
              </td>
              <td style="padding: 8pt; border-bottom: 1px solid #cccccc; font-weight: bold;">Total Amount Collected</td>
              <td style="padding: 8pt; text-align: right; font-weight: bold; color: #059669; border-bottom: 1px solid #cccccc;">
                ₹${totalAmount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    tempDiv.innerHTML = reportContentHtml;
    
    // 3. Render the HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2, 
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff', // Explicitly set white background for canvas
    });
    
    // --- FILE SIZE FIX: Use JPEG with lower quality for compression ---
    const imgData = canvas.toDataURL('image/jpeg', 0.5); // 0.5 quality drastically reduces file size
    const contentWidth = canvas.width;
    const contentHeight = canvas.height;

    const contentRatio = printableWidth / contentWidth;
    const finalContentHeight = contentHeight * contentRatio;

    // 4. Add Letterhead Background (Full A4 size)
    pdf.addImage(letterheadImage, 'PNG', 0, 0, a4Width, a4Height);

    // 5. Add Content over the Letterhead (Multi-page handling)
    let heightLeft = finalContentHeight;
    let position = 0; 

    while (heightLeft > 0) {
        const contentStartX = margin;
        const contentStartY = topOffsetPt + margin;

        let imgY = contentStartY - position; 
        
        pdf.addImage(imgData, 'JPEG', contentStartX, imgY, printableWidth, finalContentHeight);

        heightLeft -= printableHeight;
        position += printableHeight;

        if (heightLeft > 0) {
            pdf.addPage();
            pdf.addImage(letterheadImage, 'PNG', 0, 0, a4Width, a4Height);
        }
    }

    // 6. Save the PDF
    pdf.save(`Appointment_Report_${format(today, 'yyyyMMdd_HHmm')}.pdf`);

    // 7. Cleanup
    document.body.removeChild(tempDiv);
    setIsExporting(false);
  };
  // -------------------


  return (
    <div className="space-y-8 mb-8">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-white border border-gray-200">
        <div className="flex items-center gap-4">
          <label className="font-semibold text-gray-700 sr-only">Filter by Date Range:</label>
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px] md:w-[200px] bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg">
              {getFilters(userRole).map((f) => (
                <SelectItem key={f.value} value={f.value} className="hover:bg-blue-50">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filter === "custom" && customStartDate && customEndDate && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-2 border-blue-200 shadow-sm">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-700 font-medium">
                {format(parseISO(customStartDate), "MMM dd")} - {format(parseISO(customEndDate), "MMM dd")}
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
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* EXPORT TO PDF BUTTON */}
          <Button
            onClick={handleExportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
          >
            <FileText className="h-4 w-4" />
            {isExporting ? "Generating PDF..." : "Export to PDF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-gray-600 border-gray-300 hover:text-red-500 hover:border-red-300 transition-colors duration-200 bg-transparent"
            aria-label="Clear filters"
          >
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>
      
      {/* ... (Modal and Stats Cards remain unchanged) ... */}
      <Dialog open={isCustomRangeModalOpen} onOpenChange={setIsCustomRangeModalOpen}>
        <DialogContent className="max-w-md bg-gradient-to-br from-white to-blue-50 border-0 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Custom Date Range
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Starting Date</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full border-gray-300 focus:border-blue-400 focus:ring-blue-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ending Date</label>
              <Input
                type="date"
                value={customEndDate}
                min={customStartDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full border-gray-300 focus:border-blue-400 focus:ring-blue-300 rounded-xl"
              />
            </div>
            {customStartDate && customEndDate && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-xs text-blue-700">
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
                  setFilter("last7days")
                  setCustomStartDate("")
                  setCustomEndDate("")
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCustomRange}
                disabled={!customStartDate || !customEndDate}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50"
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <CardTitle className="text-base font-semibold text-gray-800 tracking-tight">
                Total Appointments
              </CardTitle>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">{totalAppointments}</div>
            </div>
            <div className="flex items-center justify-center w-13 h-13 rounded-xl shadow-md bg-blue-200">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </CardHeader>
        </Card>
      </div>
      {/* Appointments List (On-Screen View)*/}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Appointments List (On-Screen View)</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-semibold">#</th>
                <th className="p-3 text-left font-semibold">Patient</th>
                <th className="p-3 text-left font-semibold">Doctor</th>
                <th className="p-3 text-left font-semibold">Date</th>
                <th className="p-3 text-left font-semibold">Time</th>
                <th className="p-3 text-left font-semibold">Note</th>
                <th className="p-3 text-left font-semibold">Cash</th>
                <th className="p-3 text-left font-semibold">Online</th>
                <th className="p-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    No appointments found for this filter.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt, idx) => {
                  const paid = getPaid(apt)
                  return (
                    <tr key={apt.id || idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3 font-medium text-gray-900">{apt.patientName}</td>
                      <td className="p-3">{apt.doctor}</td>
                      <td className="p-3">{apt.appointmentDate}</td>
                      <td className="p-3">{apt.appointmentTime}</td>
                      <td className="p-3 text-gray-600 max-w-[150px] truncate" title={apt.note}>
                        {apt.note || 'N/A'}
                      </td>
                      <td className="p-3 text-green-700 font-semibold">₹{paid.cash.toLocaleString()}</td>
                      <td className="p-3 text-blue-700 font-semibold">₹{paid.online.toLocaleString()}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            apt.status === "completed" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {apt.status ? apt.status.charAt(0).toUpperCase() + apt.status.slice(1) : "Unknown"}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}