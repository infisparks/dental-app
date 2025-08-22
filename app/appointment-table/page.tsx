"use client"
import { Sidebar } from "@/components/ui/sidebar"
import { AppointmentsTable } from "@/components/appointments/appointments-table"
import { useUser } from "@/components/ui/UserContext"
import { useState } from "react"

export default function AppointmentTablePage() {
  const { role } = useUser()
  const [activeSection, setActiveSection] = useState("add-amount")
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex flex-col">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} userRole={role} />
      <main className="md:ml-64 flex-1 flex justify-center items-start p-2 md:p-8">
        <div className="w-full min-h-[400px] md:min-h-[600px] bg-white/80 space-y-6 p-2 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-green-900 tracking-tight drop-shadow-sm">Add Amount</h1>
              <p className="text-green-600 text-lg font-medium">Manage pending appointments and process payments</p>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-green-100 to-blue-100 px-6 py-3 rounded-2xl shadow-md">
              <span className="text-green-700 font-semibold text-lg">Payments</span>
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
            </div>
          </div>
          <AppointmentsTable />
        </div>
      </main>
    </div>
  )
}
