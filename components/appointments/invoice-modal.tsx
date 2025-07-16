'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Appointment } from '@/lib/appointments';
import { Stethoscope, Calendar, User, Phone, Mail, MapPin, Printer, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export function InvoiceModal({ isOpen, onClose, appointment }: InvoiceModalProps) {
  if (!appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  const getServiceCharges = () => {
    if (appointment.serviceCharges) {
      return appointment.serviceCharges;
    }
    return {};
  };

  const serviceCharges = getServiceCharges();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Printer className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl text-gray-900">Invoice</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 print:text-black">
          {/* Clinic Header */}
          <div className="text-center border-b-2 border-blue-200 pb-6 bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl shadow-lg">
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dental Clinic</h1>
                <p className="text-lg text-blue-600 font-medium">Professional Dental Care</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>123 Medical Street, Health City, HC 12345</p>
              <p>Phone: +91 9876543210 | Email: info@dentalclinic.com</p>
              <p className="text-xs text-gray-500">Invoice #INV-{appointment.id?.slice(-8).toUpperCase()}</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-blue-200 shadow-md">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {appointment.patientName}</div>
                  <div><strong>Age:</strong> {appointment.age}</div>
                  <div><strong>Gender:</strong> {appointment.gender}</div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{appointment.contactNumber}</span>
                  </div>
                  {appointment.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{appointment.email}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5" />
                    <span className="text-xs">{appointment.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 shadow-md">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointment Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Date:</strong> {appointment.appointmentDate}</div>
                  <div><strong>Time:</strong> {appointment.appointmentTime}</div>
                  <div><strong>Doctor:</strong> {appointment.doctor}</div>
                  <div><strong>Services:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {appointment.services?.map((service, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {service}
                        </Badge>
                      )) || appointment.services}
                    </div>
                  </div>
                  <div><strong>Status:</strong> <span className="text-green-600 font-medium">Completed</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Breakdown */}
          {Object.keys(serviceCharges).length > 0 && (
            <Card className="border-purple-200 shadow-md">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Service Breakdown
                </h3>
                <div className="space-y-2">
                  {Object.entries(serviceCharges).map(([service, charge]) => (
                    <div key={service} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm text-gray-700">{service}</span>
                      <span className="font-medium text-gray-900">₹{charge}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-purple-200 font-semibold">
                    <span>Subtotal:</span>
                    <span>₹{Object.values(serviceCharges).reduce((sum, charge) => sum + charge, 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Payment Details */}
          <Card className="border-green-200 shadow-md bg-gradient-to-r from-green-50 to-white">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Payment Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span>Service Charge:</span>
                  <span className="font-medium">₹{appointment.totalAmount}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Payment Method:</span>
                  <span className="capitalize font-medium text-blue-600">{appointment.paymentMethod}</span>
                </div>
                {appointment.paymentMethod === 'cash+online' && (
                  <>
                    <div className="flex justify-between text-sm text-gray-600 py-1">
                      <span>Cash Amount:</span>
                      <span className="font-medium">₹{appointment.cashAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 py-1">
                      <span>Online Amount:</span>
                      <span className="font-medium">₹{appointment.onlineAmount}</span>
                    </div>
                  </>
                )}
                <div className="border-t-2 border-green-200 pt-3 flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-green-600">₹{appointment.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t-2 border-gray-200 pt-6 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-700 mb-2">Thank you for choosing our dental services!</p>
            <p>Invoice generated on {format(new Date(), 'PPP')}</p>
            <p className="text-xs mt-2">This is a computer-generated invoice and does not require a signature.</p>
          </div>

          <div className="flex gap-2 print:hidden">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}