"use client";
import { Sidebar } from '@/components/ui/sidebar';
import  AppointmentForm  from '@/components/appointments/appointment-form';
import { useUser } from '@/components/ui/UserContext';
import { useState } from 'react';

export default function BookAppointmentPage() {
  const { role } = useUser();
  const [activeSection, setActiveSection] = useState('book-appointment');
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} userRole={role} />
      <main className="md:ml-64 p-2 md:p-8 max-w-7xl mx-auto w-full">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight drop-shadow-sm">Book Appointment</h1>
              <p className="text-blue-600 text-lg font-medium">Schedule a new patient appointment</p>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-100 to-teal-100 px-6 py-3 rounded-2xl shadow-md">
              <span className="text-blue-700 font-semibold text-lg">New Booking</span>
              <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></span>
            </div>
          </div>
          <AppointmentForm />
        </div>
      </main>
    </div>
  );
} 