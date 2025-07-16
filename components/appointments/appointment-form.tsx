'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { addAppointment } from '@/lib/appointments';
import { format } from 'date-fns';
import { ChevronDown, Calendar as CalendarIcon, User, Phone, MapPin, Stethoscope, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/ui/UserContext';

const appointmentSchema = z.object({
  patientName: z.string()
    .min(2, 'Patient name must be at least 2 characters')
    .max(50, 'Patient name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Patient name can only contain letters and spaces')
    .refine((name) => name.trim().length > 0, 'Patient name cannot be empty'),
  age: z.number()
    .min(1, 'Age must be at least 1 year')
    .max(120, 'Age must be less than 120 years')
    .int('Age must be a whole number'),
  gender: z.string().min(1, 'Please select gender'),
  contactNumber: z.string()
    .min(10, 'Contact number must be at least 10 digits')
    .max(15, 'Contact number must be less than 15 digits')
    .regex(/^[0-9+\-\s()]+$/, 'Contact number can only contain numbers, +, -, spaces, and parentheses')
    .refine((phone) => {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      return cleanPhone.length >= 10 && cleanPhone.length <= 15;
    }, 'Please enter a valid contact number'),
  email: z.string()
    .optional()
    .refine((email) => {
      if (!email || email === '') return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }, 'Please enter a valid email address'),
  address: z.string()
    .max(200, 'Address must be less than 200 characters')
    .optional(),
  doctor: z.string().min(1, 'Please select a doctor'),
  services: z.array(z.string()).min(1, 'Please select at least one service'),
  appointmentDate: z.string()
    .min(1, 'Please select appointment date'), // Remove past date restriction
  appointmentTime: z.string()
    .min(1, 'Please select appointment time'), // Remove time range restriction
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const doctors = [
  'Dr. Mudassir Shaikh',
  'Dr. Moin Zariwala',
  'Dr. Daanish Shaikh',
  'Dr. Kamlesh Bhondu',
];

const services = [
  { name: 'Teeth Cleaning', charge: 1500 },
  { name: 'Root Canal', charge: 8000 },
  { name: 'Teeth Extraction', charge: 2000 },
  { name: 'Dental Fillings', charge: 3000 },
  { name: 'Dental Crown', charge: 12000 },
  { name: 'Teeth Whitening', charge: 5000 },
  { name: 'Orthodontic Treatment', charge: 25000 },
  { name: 'Dental Implant', charge: 35000 },
];

export function AppointmentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [serviceCharges, setServiceCharges] = useState<{ [service: string]: number }>({});
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      appointmentDate: format(new Date(), 'yyyy-MM-dd'),
      appointmentTime: '10:00',
      services: [],
    },
    mode: 'onChange',
  });

  const router = useRouter();
  const { role } = useUser();

  const handleServiceChange = (serviceName: string, charge: number, checked: boolean) => {
    let updatedServices;
    let updatedCharges = { ...serviceCharges };
    if (checked) {
      updatedServices = [...selectedServices, serviceName];
      updatedCharges[serviceName] = charge;
    } else {
      updatedServices = selectedServices.filter(s => s !== serviceName);
      delete updatedCharges[serviceName];
    }
    setSelectedServices(updatedServices);
    setServiceCharges(updatedCharges);
    setValue('services', updatedServices);
    trigger('services');
  };

  const getTotalServiceCharge = () => {
    return Object.values(serviceCharges).reduce((sum, charge) => sum + charge, 0);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    try {
      await addAppointment({
        ...data,
        age: Number(data.age),
        email: data.email || '',
        address: data.address || '', // ensure address is always a string
        services: selectedServices,
        serviceCharges,
        status: 'pending',
        createdAt: '',
      });

      // WhatsApp message sending logic
      const patientName = data.patientName;
      const appointmentDate = data.appointmentDate;
      const appointmentTime = data.appointmentTime;
      const doctor = data.doctor;
      const number = data.contactNumber.replace(/[^0-9]/g, ''); // Clean number
      const selectedServiceList = selectedServices.map(
        (service) => `• ${service} (₹${serviceCharges[service]})`
      ).join('\n');
      const totalCharge = getTotalServiceCharge();

      // Professional, bolded WhatsApp message
      const message = `*MEDORA Dental Clinic*\n\n*Appointment Confirmation*\n\nDear *${patientName}*,\n\nYour appointment has been *successfully booked* with us.\n\n*Details:*\n*Date:* ${appointmentDate}\n*Time:* ${appointmentTime}\n*Doctor:* ${doctor}\n*Services:*\n\nThank you for choosing *MEDORA*. We look forward to seeing you!\n\nIf you have any questions, reply to this message.`;

      try {
        await fetch("https://wa.medblisss.com/send-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: "99583991573",
            number: `91${number}`,
            message,
          }),
        });
      } catch (waError) {
        // Optionally, you can show a toast or log the error
        console.error('Failed to send WhatsApp message:', waError);
      }
      
      toast.success('Appointment booked successfully!');
      // Reset form
      reset({
        appointmentDate: format(new Date(), 'yyyy-MM-dd'),
        appointmentTime: '10:00',
        services: [],
      });
      setSelectedServices([]);
      setServiceCharges({});
      // Redirect after booking
      router.push('/appointment-table');
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldError = (error: any) => {
    if (!error) return null;
    return (
      <div className="flex items-center gap-1 text-sm text-red-500 mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{error.message}</span>
      </div>
    );
  };

  return (
    
    <Card className="max-w-2xl mx-auto shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl text-gray-900">Book New Appointment</CardTitle>
            <CardDescription className="text-gray-600">Fill in the patient details to schedule an appointment</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patientName" className="flex items-center gap-2 text-gray-700 font-medium">
                <User className="h-4 w-4" />
                Patient Full Name *
              </Label>
              <Input
                id="patientName"
                {...register('patientName')}
                placeholder="Enter patient full name"
                className={`mt-1 ${errors.patientName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} focus:ring-blue-500`}
              />
              {renderFieldError(errors.patientName)}
            </div>

            <div>
              <Label htmlFor="age" className="text-gray-700 font-medium">Age *</Label>
              <Input
                id="age"
                type="number"
                {...register('age', { valueAsNumber: true })}
                placeholder="Enter age (1-120)"
                min="1"
                max="120"
                className={`mt-1 ${errors.age ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} focus:ring-blue-500`}
              />
              {renderFieldError(errors.age)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender" className="text-gray-700 font-medium">Gender *</Label>
              <Select onValueChange={(value) => { setValue('gender', value); trigger('gender'); }}>
                <SelectTrigger className={`mt-1 ${errors.gender ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {renderFieldError(errors.gender)}
            </div>

            <div>
              <Label htmlFor="contactNumber" className="flex items-center gap-2 text-gray-700 font-medium">
                <Phone className="h-4 w-4" />
                Contact Number *
              </Label>
              <Input
                id="contactNumber"
                {...register('contactNumber')}
                placeholder="Enter contact number"
                className={`mt-1 ${errors.contactNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} focus:ring-blue-500`}
              />
              {renderFieldError(errors.contactNumber)}
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-700 font-medium">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter email address"
              className={`mt-1 ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} focus:ring-blue-500`}
            />
            {renderFieldError(errors.email)}
          </div>

          <div>
            <Label htmlFor="address" className="flex items-center gap-2 text-gray-700 font-medium">
              <MapPin className="h-4 w-4" />
              Address (Optional)
            </Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Enter complete address (minimum 10 characters)"
              className={`mt-1 ${errors.address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} focus:ring-blue-500`}
              rows={3}
            />
            {renderFieldError(errors.address)}
          </div>

          <div>
            <Label htmlFor="doctor" className="flex items-center gap-2 text-gray-700 font-medium">
              <Stethoscope className="h-4 w-4" />
              Select Doctor *
            </Label>
            <Select onValueChange={(value) => { setValue('doctor', value); trigger('doctor'); }}>
              <SelectTrigger className={`mt-1 ${errors.doctor ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor} value={doctor}>
                    {doctor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderFieldError(errors.doctor)}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">Select Services * (Multiple selection allowed)</Label>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setIsServicesOpen(!isServicesOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.services ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              >
                <span className="text-gray-700">
                  {selectedServices.length === 0 
                    ? 'Select services...' 
                    : `${selectedServices.length} service(s) selected`
                  }
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {isServicesOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {services.map((service) => (
                    <label
                      key={service.name}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service.name)}
                          onChange={(e) => handleServiceChange(service.name, service.charge, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{service.name}</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">₹{service.charge}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {selectedServices.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedServices.map((service) => (
                    <span key={service} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {service} - ₹{serviceCharges[service]}
                    </span>
                  ))}
                </div>
                <div className="text-sm font-medium text-gray-700">
                  Total Service Charge: <span className="text-green-600">₹{getTotalServiceCharge()}</span>
                </div>
              </div>
            )}
            
            {renderFieldError(errors.services)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="appointmentDate" className="flex items-center gap-2 text-gray-700 font-medium">
                <CalendarIcon className="h-4 w-4" />
                Appointment Date *
              </Label>
              <Input
                id="appointmentDate"
                type="date"
                {...register('appointmentDate')}
                className={`mt-1 ${errors.appointmentDate ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} focus:ring-blue-500`}
              />
              {renderFieldError(errors.appointmentDate)}
            </div>

            <div>
              <Label htmlFor="appointmentTime" className="text-gray-700 font-medium">Appointment Time *</Label>
              <Input
                id="appointmentTime"
                type="time"
                {...register('appointmentTime')}
                className={`mt-1 ${errors.appointmentTime ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} focus:ring-blue-500`}
              />
              {renderFieldError(errors.appointmentTime)}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Booking Appointment...' : 'Book Appointment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}