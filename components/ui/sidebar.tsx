'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, Calendar, DollarSign, Eye, LogOut, Stethoscope, BarChart } from 'lucide-react';
import { logout } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image'; // Import the Next.js Image component

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userRole?: 'admin' | 'staff' | null;
}

export function Sidebar({ activeSection, onSectionChange, userRole }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false); // for desktop toggle
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  let menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Calendar },
    { id: 'graph', label: 'Graph', icon: BarChart },
    { id: 'book-appointment', label: 'Book Appointment', icon: Calendar },
    { id: 'add-amount', label: 'Add Amount', icon: DollarSign },
    { id: 'view-attended', label: 'View Attended', icon: Eye },
  ];

  // Remove Dashboard and Graph for staff
  if (userRole === 'staff') {
    menuItems = menuItems.filter(item => item.id !== 'dashboard' && item.id !== 'graph');
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Image Section */}
          <div className={cn(
            'flex items-center border-b border-gray-200 transition-all duration-300 h-[105px]', // Set a fixed height to prevent layout shifts
            collapsed ? 'justify-center' : 'p-6 justify-start'
          )}>
            {!collapsed ? (
              <Image
                src="/images/medora.png" // Path from the public directory
                alt="Medora Clinic Logo"
                width={180}
                height={60}
                priority // Preload the logo for better performance
                className="object-contain"
              />
            ) : (
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              let route = '/';
              switch (item.id) {
                case 'dashboard':
                  route = '/dashboard';
                  break;
                case 'book-appointment':
                  route = '/bookappointment';
                  break;
                case 'add-amount':
                  route = '/appointment-table';
                  break;
                case 'view-attended':
                  route = '/attended-appointment';
                  break;
                case 'graph':
                  route = '/graph';
                  break;
                default:
                  route = '/';
              }
              const isActive = pathname === route;
              return (
                <Button
                  key={item.id}
                  variant={undefined}
                  className={cn(
                    "w-full justify-start gap-3 h-12 transition-all duration-300 border-0",
                    isActive
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800",
                    collapsed ? 'justify-center px-0' : ''
                  )}
                  onClick={() => {
                    router.push(route);
                    setIsOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  {!collapsed && item.label}
                </Button>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className={cn("p-4 border-t border-gray-200 transition-all duration-300", collapsed ? 'p-2 flex justify-center' : '')}>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start gap-3 h-12 text-red-600 border-red-200 hover:bg-red-50 transition-all duration-300",
                collapsed ? 'justify-center px-0' : ''
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && 'Logout'}
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}