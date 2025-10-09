"use client";
import { Sidebar } from '@/components/ui/sidebar';
import { Graph } from '@/components/appointments/graph';
import { useUser } from '@/components/ui/UserContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GraphPage() {
  const { role } = useUser();
  const [activeSection, setActiveSection] = useState('graph');
  const router = useRouter();

  useEffect(() => {
    if (role === 'staff') {
      router.replace('/bookappointment');
    }
  }, [role, router]);
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} userRole={role} />
      <Graph />
    </div>
  );
} 