"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Appointment } from "@/lib/appointments"
import { Stethoscope, Calendar, User, Phone, Mail, MapPin, Printer, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, get } from "firebase/database"

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
}

export function InvoiceModal({ isOpen, onClose, appointment }: InvoiceModalProps) {
  const [totalServiceCharge, setTotalServiceCharge] = useState(0)
  const [totalAmountPaid, setTotalAmountPaid] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [serviceCharges, setServiceCharges] = useState<Record<string, number>>({})

  useEffect(() => {
    if (appointment && appointment.createdAt) {
      fetchFirebaseData()
    }
  }, [appointment])

  const fetchFirebaseData = async () => {
    if (!appointment || !appointment.createdAt) return

    try {
      const createdDate = new Date(appointment.createdAt)
      const year = createdDate.getFullYear().toString()
      const month = (createdDate.getMonth() + 1).toString().padStart(2, "0")
      const date = createdDate.getDate().toString().padStart(2, "0")

      const serviceChargesRef = ref(database, `appointments/${year}/${month}/${date}/${appointment.id}/serviceCharges`)
      const serviceChargesSnapshot = await get(serviceChargesRef)

      let totalService = 0
      let charges: Record<string, number> = {}
      if (serviceChargesSnapshot.exists()) {
        const serviceChargesData = serviceChargesSnapshot.val()
        charges = Object.entries(serviceChargesData).reduce(
          (acc, [service, charge]) => {
            const numericCharge = Number(charge) || 0
            acc[service] = numericCharge
            totalService += numericCharge
            return acc
          },
          {} as Record<string, number>,
        )
      }
      setServiceCharges(charges)
      setTotalServiceCharge(totalService)

      const paymentRef = ref(database, `appointments/${year}/${month}/${date}/${appointment.id}/payment`)
      const paymentSnapshot = await get(paymentRef)

      let totalPaid = 0
      let method = ""
      let discount = 0
      if (paymentSnapshot.exists()) {
        const paymentData = paymentSnapshot.val()
        const cashAmount = Number(paymentData.cashAmount) || 0
        const onlineAmount = Number(paymentData.onlineAmount) || 0
        totalPaid = cashAmount + onlineAmount
        method = paymentData.paymentMethod || ""
        discount = Number(paymentData.discountAmount) || 0
      }
      setTotalAmountPaid(totalPaid)
      setPaymentMethod(method)
      setDiscountAmount(discount)

      setRemainingAmount(totalService - discount - totalPaid)
    } catch (error) {
      console.error("Error fetching Firebase data:", error)
    }
  }

  if (!appointment) return null

  const handlePrint = () => {
    window.print()
  }

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

          <div className="grid grid-cols-2 gap-6">
            <Card className="border-blue-200 shadow-md">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Name:</strong> {appointment.patientName}
                  </div>
                  <div>
                    <strong>Age:</strong> {appointment.age}
                  </div>
                  <div>
                    <strong>Gender:</strong> {appointment.gender}
                  </div>
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
                  <div>
                    <strong>Date:</strong> {appointment.appointmentDate}
                  </div>
                  <div>
                    <strong>Time:</strong> {appointment.appointmentTime}
                  </div>
                  <div>
                    <strong>Doctor:</strong> {appointment.doctor}
                  </div>
                  <div>
                    <strong>Services:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {appointment.services?.map((service, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {service}
                        </Badge>
                      )) || "N/A"}
                    </div>
                  </div>
                  <div>
                    <strong>Status:</strong> <span className="text-green-600 font-medium">Completed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {Object.keys(serviceCharges).length > 0 && (
            <Card className="border-purple-200 shadow-md">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Service Breakdown
                </h3>
                <div className="space-y-2">
                  {Object.entries(serviceCharges).map(([service, charge]) => (
                    <div
                      key={service}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <span className="text-sm text-gray-700">{service}</span>
                      <span className="font-medium text-gray-900">₹{charge}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-purple-200 font-semibold">
                    <span>Subtotal:</span>
                    <span>
                      ₹{Object.values(serviceCharges).reduce((sum: number, charge: number) => sum + charge, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-green-200 shadow-md bg-gradient-to-r from-green-50 to-white">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Payment Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span>Total Service Charge:</span>
                  <span className="font-medium">₹{totalServiceCharge}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span>Discount Amount:</span>
                    <span className="font-medium text-orange-600">₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span>Total Amount Paid:</span>
                  <div className="flex flex-col items-end">
                    <span className="font-medium text-green-600">₹{totalAmountPaid}</span>
                    <span className="capitalize text-xs text-blue-500">({paymentMethod})</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-gray-900">Remaining Amount:</span>
                  <span className={`${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                    ₹{remainingAmount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500 border-t-2 border-gray-200 pt-6 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-700 mb-2">Thank you for choosing our dental services!</p>
            <p>Invoice generated on {format(new Date(), "PPP")}</p>
            <p className="text-xs mt-2">This is a computer-generated invoice and does not require a signature.</p>
          </div>

          <div className="flex gap-2 print:hidden">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}