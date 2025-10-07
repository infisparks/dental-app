"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react" // Import useRef
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
// Import necessary format functions from date-fns
import { format, getHours, getMinutes } from "date-fns" 
import { ChevronDown, CalendarIcon, User, Phone, MapPin, Stethoscope, AlertCircle, Clock, FileText, Search } from "lucide-react" 
import { useRouter } from "next/navigation"
import { useUser } from "@/components/ui/UserContext"

// --- FIREBASE IMPORTS AND SETUP ---
// NOTE: Assuming this file is placed where it can access the shared Firebase setup.
import { database, ref, push, set, get } from "@/lib/firebase" 

// --- INTERFACE DEFINITIONS (Duplicated here for context, ensure it matches lib/firebase.ts) ---

export interface ServiceItem {
  name: string
  charge: number
}

export interface Appointment {
  id?: string
  patientName: string
  age: number
  gender: string
  contactNumber: string
  email?: string
  address: string
  doctor: string
  services: string[]
  serviceCharges: { [service: string]: number }
  appointmentDate: string
  appointmentTime: string
  status: "pending" | "completed"
  paymentMethod?: string
  cashAmount?: number
  onlineAmount?: number
  totalAmount?: number
  createdAt: string
  updatedAt?: string
  note?: string 
  payment?: {
    paymentMethod: string
    cashAmount: number
    onlineAmount: number
    discountAmount?: number
    cashType?: string
    onlineType?: string
    createdAt: string
  }
}

// --- UTILITY FUNCTIONS FOR DYNAMIC DATA ---

/**
 * Fetches the list of doctors from the database, handling the array structure.
 */
const getDoctors = async (): Promise<string[]> => {
  try {
    const doctorRef = ref(database, "doctor")
    const snapshot = await get(doctorRef)

    if (!snapshot.exists()) {
      return []
    }

    const doctorData = snapshot.val()
    
    // Logic to handle Firebase array structure: [null, {name: 'Ayesha Khan'}, {name: 'Asra Khan'}]
    if (Array.isArray(doctorData)) {
        return doctorData
            .map((item: any) => item?.name) 
            .filter((name: string | undefined) => typeof name === 'string' && name.trim() !== '') as string[]
    }
    
    // Fallback for simple object structure
    if (doctorData && typeof doctorData.name === 'string') {
      return [doctorData.name]
    }

    return []
  } catch (error) {
    console.error("Error fetching doctors:", error)
    return []
  }
}

/**
 * Fetches the clean list of services and their charges from the new /services_master path
 */
const getServicesMaster = async (): Promise<ServiceItem[]> => {
  try {
    const servicesRef = ref(database, "services_master")
    const snapshot = await get(servicesRef)

    if (!snapshot.exists()) {
      return []
    }

    const servicesData = snapshot.val()
    const services: ServiceItem[] = []

    Object.values(servicesData || {}).forEach((data: any) => {
      if (data && typeof data.name === 'string' && typeof data.price === 'number') {
        services.push({
          name: data.name,
          charge: data.price,
        })
      }
    })

    return services.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error)
 {
    console.error("Error fetching master services:", error)
    return []
  }
}

// Helper function to get date parts
const getDateParts = (date: Date) => {
    return {
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString().padStart(2, "0"),
      day: date.getDate().toString().padStart(2, "0"),
    }
}

// Add a new appointment
export const addAppointment = async (appointment: Omit<Appointment, "id">) => {
    try {
      const now = new Date()
      const { year, month, day } = getDateParts(now)

      const appointmentsRef = ref(database, `appointments/${year}/${month}/${day}`)
      const newAppointmentRef = push(appointmentsRef)

      const appointmentData = {
        ...appointment,
        status: "pending" as const,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await set(newAppointmentRef, appointmentData)
      return newAppointmentRef.key
    } catch (error) {
      console.error("Error adding appointment:", error)
      throw error
    }
}


// --- ZOD Schema ---

const appointmentSchema = z.object({
  patientName: z
    .string()
    .min(2, "Patient name must be at least 2 characters")
    .max(50, "Patient name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Patient name can only contain letters and spaces")
    .refine((name) => name.trim().length > 0, "Patient name cannot be empty"),
  age: z
    .number()
    .min(1, "Age must be at least 1 year")
    .max(120, "Age must be less than 120 years")
    .int("Age must be a whole number"),
  gender: z.string().min(1, "Please select gender"),
  contactNumber: z.string().regex(/^\+91\d{10}$/, "Contact number must be exactly 10 digits and start with +91"),
  email: z
    .string()
    .optional()
    .refine((email) => {
      if (!email || email === "") return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }, "Please enter a valid email address"),
  address: z.string().max(200, "Address must be less than 200 characters").optional(),
  doctor: z.string().min(1, "Please select a doctor"),
  services: z.array(z.string()).min(1, "Please select at least one service"),
  appointmentDate: z.string().min(1, "Please select appointment date"),
  appointmentTime: z.string().min(1, "Please select appointment time"),
  note: z.string().max(300, "Note must be less than 300 characters").optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

// --- Utility to get Current Time for Default Value ---
const getCurrentTime12hr = (date: Date) => {
    // Round minutes up to the nearest quarter hour (0, 15, 30, 45) for better UX
    const minutes = date.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;

    // Add minutes to the date object
    const roundedDate = new Date(date.getTime() + (roundedMinutes - minutes) * 60000);

    // Format as "HH:mm AA" (e.g., "08:15 AM")
    return format(roundedDate, "hh:mm a");
}

export default function AppointmentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const [serviceCharges, setServiceCharges] = useState<{ [service: string]: number }>({})
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState("") 
  
  // Ref for the service dropdown area
  const serviceDropdownRef = useRef<HTMLDivElement>(null); 

  const initialDate = new Date();

  // Time picker state initialization
  const initialHours = getHours(initialDate);
  const initialMinutes = getMinutes(initialDate);
  const roundedInitialMinutes = Math.ceil(initialMinutes / 15) * 15;
  const initialTimeRounded = new Date(initialDate.getTime() + (roundedInitialMinutes - initialMinutes) * 60000);

  let initialHour12 = getHours(initialTimeRounded) % 12;
  initialHour12 = initialHour12 === 0 ? 12 : initialHour12;
  const initialPeriod = getHours(initialTimeRounded) >= 12 ? "PM" : "AM";
  
  const [selectedHour, setSelectedHour] = useState(initialHour12)
  const [selectedMinute, setSelectedMinute] = useState(getMinutes(initialTimeRounded))
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(initialPeriod)

  // --- Dynamic State ---
  const [doctors, setDoctors] = useState<string[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  // Form loads immediately, data is fetched in background
  const [isLoadingData, setIsLoadingData] = useState(true) 
  // ---------------------

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
      appointmentDate: format(initialDate, "yyyy-MM-dd"),
      appointmentTime: getCurrentTime12hr(initialDate), 
      services: [],
      contactNumber: "+91",
      doctor: "",
      note: "",
    },
    mode: "onChange",
  })

  const router = useRouter()
  // const { role } = useUser() 

  // --- Dynamic Data Fetching Effect (In Background) ---
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const [fetchedDoctors, fetchedServices] = await Promise.all([
          getDoctors(),
          getServicesMaster(),
        ])
        setDoctors(fetchedDoctors)
        setServices(fetchedServices)
        
        // If only one doctor, set it as default
        if (fetchedDoctors.length === 1) {
            setValue("doctor", fetchedDoctors[0])
        }

      } catch (error) {
        toast.error("Failed to load doctors or services data.")
        console.error("Error loading dynamic data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchDynamicData()
  }, [setValue])
  // ------------------------------------

  // --- EFFECT TO HIDE DROPDOWN ON OUTSIDE CLICK ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if the click is outside the entire service dropdown area
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServicesOpen(false);
        setServiceSearchTerm(''); // Optional: clear search on close
      }
    }

    if (isServicesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    // Cleanup the event listener on component unmount or when dropdown closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isServicesOpen]);
  // --------------------------------------------------

  // Filter services based on search term
  const filteredServices = services.filter(service =>
      service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  )

  const handleServiceChange = (serviceName: string, charge: number, checked: boolean) => {
    let updatedServices
    const updatedCharges = { ...serviceCharges }
    if (checked) {
      updatedServices = [...selectedServices, serviceName]
      updatedCharges[serviceName] = charge
    } else {
      updatedServices = selectedServices.filter((s) => s !== serviceName)
      delete updatedCharges[serviceName]
    }
    setSelectedServices(updatedServices)
    setServiceCharges(updatedCharges)
    setValue("services", updatedServices)
    trigger("services")
  }

  const getTotalServiceCharge = useCallback(() => {
    return Object.values(serviceCharges).reduce((sum, charge) => sum + charge, 0)
  }, [serviceCharges])

  const onSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true)
    try {
      await addAppointment({
        ...data,
        age: Number(data.age),
        email: data.email || "",
        address: data.address || "",
        note: data.note || "", 
        services: selectedServices,
        serviceCharges,
        status: "pending",
        createdAt: "", 
      })

      // --- WhatsApp Notification Logic ---
      const patientName = data.patientName
      const appointmentDate = data.appointmentDate
      const appointmentTime = data.appointmentTime
      const doctor = data.doctor
      const number = data.contactNumber.replace(/^\+91/, "")
      const selectedServiceList = selectedServices
        .map((service) => `• ${service} (₹${serviceCharges[service]})`)
        .join("\n")
      const totalCharge = getTotalServiceCharge()

      const message = `*MEDORA Dental Clinic*\n\n*Appointment Confirmation*\n\nDear *${patientName}*,\n\nYour appointment has been *successfully booked* with us.\n\n*Details:*\n*Date:* ${appointmentDate}\n*Time:* ${appointmentTime}\n*Doctor:* ${doctor}\n*Services:*\n${selectedServiceList}\n\n*Total Estimated Charge:* ₹${totalCharge}\n\nThank MUDASSIR for choosing *MEDORA*. We look forward to seeing you!\n\n${data.note ? `*Note for Doctor:* ${data.note}\n\n` : ''}If you have any questions, reply to this message.`

      try {
        await fetch("https://wa.medblisss.com/send-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: "99583991573",
            number: `91${number}`,
            message,
          }),
        })
      } catch (waError) {
        console.error("Failed to send WhatsApp message:", waError)
      }


      toast.success("Appointment booked successfully!")
      // Reset form with current date and time
      const resetDate = new Date();
      reset({
        appointmentDate: format(resetDate, "yyyy-MM-dd"),
        appointmentTime: getCurrentTime12hr(resetDate),
        services: [],
        contactNumber: "+91",
        doctor: doctors.length === 1 ? doctors[0] : "", 
        note: "", 
      })
      setSelectedServices([])
      setServiceCharges({})
      // Reset time picker state to match new reset time
      const resetHours = getHours(resetDate);
      const resetMinutes = getMinutes(resetDate);
      const resetRoundedMinutes = Math.ceil(resetMinutes / 15) * 15;
      const resetTimeRounded = new Date(resetDate.getTime() + (resetRoundedMinutes - resetMinutes) * 60000);

      let resetHour12 = getHours(resetTimeRounded) % 12;
      resetHour12 = resetHour12 === 0 ? 12 : resetHour12;
      const resetPeriod = getHours(resetTimeRounded) >= 12 ? "PM" : "AM";

      setSelectedHour(resetHour12);
      setSelectedMinute(getMinutes(resetTimeRounded));
      setSelectedPeriod(resetPeriod);
      
    } catch (error) {
      console.error("Error booking appointment:", error)
      toast.error("Failed to book appointment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFieldError = (error: any) => {
    if (!error) return null
    return (
      <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{error.message}</span>
      </div>
    )
  }

  /**
   * Enforce 10-digit limit directly in the input handler for better UX.
   */
  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    // Remove all non-digits, keep only the first 10 digits
    const cleanedValue = value.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10)
    
    // Always prefix with +91
    setValue("contactNumber", "+91" + cleanedValue, { shouldValidate: true })
  }

  const handleTimeSelect = () => {
    const formattedTime = `${selectedHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")} ${selectedPeriod}`
    setValue("appointmentTime", formattedTime)
    trigger("appointmentTime")
    setIsTimePickerOpen(false)
  }

  const formatDisplayTime = (time: string) => {
    return time || "Select time"
  }
  
  return (
    <Card className="max-w-xl mx-auto shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-gray-900">Book New Appointment</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Fill in the patient details to schedule an appointment
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          
          {/* Row 1: Patient Name, Age, Gender (3 columns on sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Patient Name */}
            <div>
              <Label htmlFor="patientName" className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <User className="h-3 w-3" />
                Patient Full Name *
              </Label>
              <Input
                id="patientName"
                {...register("patientName")}
                placeholder="Full name"
                className={`h-9 mt-1 text-sm ${errors.patientName ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"} focus:ring-blue-500`}
              />
              {renderFieldError(errors.patientName)}
            </div>

            {/* Age */}
            <div>
              <Label htmlFor="age" className="text-sm text-gray-700 font-medium">
                Age *
              </Label>
              <Input
                id="age"
                type="number"
                {...register("age", { valueAsNumber: true })}
                placeholder="Age"
                min="1"
                max="120"
                className={`h-9 mt-1 text-sm ${errors.age ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"} focus:ring-blue-500`}
              />
              {renderFieldError(errors.age)}
            </div>
            
            {/* Gender */}
            <div>
              <Label htmlFor="gender" className="text-sm text-gray-700 font-medium">
                Gender *
              </Label>
              <Select
                onValueChange={(value) => {
                  setValue("gender", value)
                  trigger("gender")
                }}
                value={watch("gender")}
              >
                <SelectTrigger
                  className={`h-9 mt-1 text-sm ${errors.gender ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`}
                >
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
          </div>

          {/* Row 2: Contact Number, Email (2 columns on md+) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Contact Number */}
            <div>
              <Label htmlFor="contactNumber" className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <Phone className="h-3 w-3" />
                Contact Number *
              </Label>
              <Input
                id="contactNumber"
                {...register("contactNumber")}
                placeholder="+91"
                className={`h-9 mt-1 text-sm ${errors.contactNumber ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"} focus:ring-blue-500`}
                onChange={handleContactNumberChange} 
                value={watch("contactNumber")}
                maxLength={13}
              />
              {renderFieldError(errors.contactNumber)}
            </div>
            
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm text-gray-700 font-medium">
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="Enter email address"
                className={`h-9 mt-1 text-sm ${errors.email ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"} focus:ring-blue-500`}
              />
              {renderFieldError(errors.email)}
            </div>
          </div>

          {/* Row 3: Address, Note (2 columns on md+) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Address */}
            <div>
              <Label htmlFor="address" className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <MapPin className="h-3 w-3" />
                Address (Optional)
              </Label>
              <Textarea
                id="address"
                {...register("address")}
                placeholder="Enter complete address"
                className={`mt-1 text-sm ${errors.address ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"} focus:ring-blue-500`}
                rows={2}
              />
              {renderFieldError(errors.address)}
            </div>
            
            {/* Note */}
            <div>
              <Label htmlFor="note" className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <FileText className="h-3 w-3" />
                Note for Doctor (Optional)
              </Label>
              <Textarea
                id="note"
                {...register("note")}
                placeholder="e.g., Patient is very nervous."
                className={`mt-1 text-sm ${errors.note ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"} focus:ring-blue-500`}
                rows={2}
              />
              {renderFieldError(errors.note)}
            </div>
          </div>

          {/* Row 4: Doctor Selection (Full Width) */}
          <div>
            <Label htmlFor="doctor" className="flex items-center gap-1 text-sm text-gray-700 font-medium">
              <Stethoscope className="h-3 w-3" />
              Select Doctor *
            </Label>
            <Select
              onValueChange={(value) => {
                setValue("doctor", value)
                trigger("doctor")
              }}
              value={watch("doctor")}
              disabled={isLoadingData} 
            >
              <SelectTrigger
                className={`h-9 mt-1 text-sm ${errors.doctor ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`}
              >
                <SelectValue placeholder={isLoadingData ? "Loading doctors..." : "Select doctor"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingData && (
                    <div className="flex items-center p-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4 animate-spin mr-2"/> Loading...
                    </div>
                )}
                {!isLoadingData && doctors.map((doctor) => (
                  <SelectItem key={doctor} value={doctor}>
                    {doctor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderFieldError(errors.doctor)}
          </div>

          {/* Row 5: Service Selection with Search (Full Width) */}
          <div ref={serviceDropdownRef}> {/* Attach ref here */}
            <Label className="text-sm text-gray-700 font-medium">Select Services * (Multiple selection allowed)</Label>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => {
                    if (!isLoadingData) setIsServicesOpen(!isServicesOpen)
                }}
                className={`h-9 w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 ${errors.services ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`}
                disabled={isLoadingData} 
              >
                <span className="text-sm text-gray-700">
                  {isLoadingData 
                    ? <span className="flex items-center"><Clock className="w-3 h-3 animate-spin mr-2"/> Loading services...</span>
                    : selectedServices.length === 0
                        ? "Select services..."
                        : `${selectedServices.length} service(s) selected`}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {isServicesOpen && !isLoadingData && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                    {/* Search Input */}
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search services..."
                                value={serviceSearchTerm}
                                onChange={(e) => setServiceSearchTerm(e.target.value)}
                                className="pl-8 h-9 text-sm"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Service List */}
                    <div className="overflow-y-auto flex-grow">
                        {filteredServices.length > 0 ? (
                            filteredServices.map((service) => (
                                <label
                                key={service.name}
                                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                                >
                                <div className="flex items-center space-x-2">
                                    <input
                                    type="checkbox"
                                    checked={selectedServices.includes(service.name)}
                                    onChange={(e) => handleServiceChange(service.name, service.charge, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">{service.name}</span>
                                </div>
                                <span className="font-medium text-green-600">₹{service.charge}</span>
                                </label>
                            ))
                        ) : (
                            <div className="p-3 text-sm text-center text-gray-500">
                                {serviceSearchTerm ? "No matching services found." : "No services available."}
                            </div>
                        )}
                    </div>
                </div>
              )}
            </div>

            {selectedServices.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedServices.map((service) => (
                    <span
                      key={service}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {service} - ₹{serviceCharges[service]}
                    </span>
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  Total Charge: <span className="text-green-600">₹{getTotalServiceCharge()}</span>
                </div>
              </div>
            )}

            {renderFieldError(errors.services)}
          </div>

          {/* Row 6: Appointment Date & Time (2 columns on md+) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="appointmentDate" className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <CalendarIcon className="h-3 w-3" />
                Appointment Date *
              </Label>
              <Input
                id="appointmentDate"
                type="date"
                {...register("appointmentDate")}
                className={`h-9 mt-1 text-sm ${errors.appointmentDate ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"} focus:ring-blue-500`}
              />
              {renderFieldError(errors.appointmentDate)}
            </div>

            <div>
              <Label htmlFor="appointmentTime" className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <Clock className="h-3 w-3" />
                Appointment Time *
              </Label>
              <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 w-full justify-start text-left font-normal mt-1 text-sm ${errors.appointmentTime ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {formatDisplayTime(watch("appointmentTime"))}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 space-y-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Select Time</div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Hour Selection */}
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Hour</Label>
                        <Select
                          value={selectedHour.toString()}
                          onValueChange={(value) => setSelectedHour(Number.parseInt(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                              <SelectItem key={hour} value={hour.toString()}>
                                {hour.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Minute Selection */}
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Minute</Label>
                        <Select
                          value={selectedMinute.toString()}
                          onValueChange={(value) => setSelectedMinute(Number.parseInt(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map((minute) => (
                              <SelectItem key={minute} value={minute.toString()}>
                                {minute.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* AM/PM Selection */}
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Period</Label>
                        <Select value={selectedPeriod} onValueChange={(value: "AM" | "PM") => setSelectedPeriod(value)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent h-8 text-sm"
                        onClick={() => setIsTimePickerOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-sm" onClick={handleTimeSelect}>
                        Select Time
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {renderFieldError(errors.appointmentTime)}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 mt-4"
            disabled={isSubmitting || isLoadingData || doctors.length === 0 || services.length === 0}
          >
            {isSubmitting ? "Booking Appointment..." : "Book Appointment"}
          </Button>
          {(doctors.length === 0 || services.length === 0) && !isLoadingData && (
              <div className="text-center text-xs text-yellow-600 flex items-center justify-center gap-1 mt-2">
                <AlertCircle className="h-3 w-3"/> Services or Doctors data missing. Cannot book.
              </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
