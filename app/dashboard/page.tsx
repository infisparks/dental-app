
'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { useUser } from '@/components/ui/UserContext';
import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { role } = useUser();
  const [activeSection, setActiveSection] = useState('dashboard');
  const router = useRouter();

  useEffect(() => {
    if (role === 'staff') {
      router.replace('/bookappointment');
    }
  }, [role, router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} userRole={role} />
      <main className="md:ml-64 p-2 md:p-8 max-w-7xl mx-auto w-full">
        <div className="space-y-8">
          {/* Header section (unchanged) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight drop-shadow-sm">Dashboard</h1>
              <p className="text-blue-600 text-lg font-medium">Welcome to the dental clinic management system</p>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-100 to-teal-100 px-6 py-3 rounded-2xl shadow-md">
              <span className="text-blue-700 font-semibold text-lg">Clinic Status</span>
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
            </div>
          </div>
          <StatsCards />
          {/* Modern Get Started Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            {/* Book Appointment */}
            <div className="rounded-2xl shadow-xl bg-gradient-to-br from-blue-100 to-white border-0 flex flex-col items-center p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-200 rounded-xl mb-4">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-blue-900 mb-2">Book Appointment</h2>
              <p className="text-blue-700 text-center mb-6">Schedule new patient appointments quickly and easily.</p>
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 shadow-md transition-colors"
                onClick={() => router.push('/bookappointment')}
              >
                Get Started
              </button>
            </div>
            {/* Add Amount */}
            <div className="rounded-2xl shadow-xl bg-gradient-to-br from-green-100 to-white border-0 flex flex-col items-center p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex items-center justify-center w-16 h-16 bg-green-200 rounded-xl mb-4">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-900 mb-2">Add Amount</h2>
              <p className="text-green-700 text-center mb-6">Manage pending appointments and process payments efficiently.</p>
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2 shadow-md transition-colors"
                onClick={() => router.push('/appointment-table')}
              >
                Get Started
              </button>
            </div>
            {/* View Attended */}
            <div className="rounded-2xl shadow-xl bg-gradient-to-br from-amber-100 to-white border-0 flex flex-col items-center p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex items-center justify-center w-16 h-16 bg-amber-200 rounded-xl mb-4">
                <Eye className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-amber-900 mb-2">View Attended</h2>
              <p className="text-amber-700 text-center mb-6">View completed appointments and generate invoices with ease.</p>
              <button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg py-2 shadow-md transition-colors"
                onClick={() => router.push('/attended-appointment')}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
