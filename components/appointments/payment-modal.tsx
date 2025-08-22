"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Appointment } from "@/lib/appointments"
import { DollarSign, CreditCard } from "lucide-react"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onPaymentComplete: (paymentData: any) => void
  appointment: Appointment | null
}

export function PaymentModal({ isOpen, onClose, onPaymentComplete, appointment }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [cashAmount, setCashAmount] = useState("")
  const [onlineAmount, setOnlineAmount] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [cashType, setCashType] = useState("")
  const [onlineType, setOnlineType] = useState("UPI")

  const getServiceCharge = () => {
    if (appointment?.serviceCharges) {
      return Object.values(appointment.serviceCharges).reduce((sum, charge) => sum + charge, 0)
    }
    return 0
  }

  const serviceCharge = getServiceCharge()
  const handleSubmit = () => {
    if (!paymentMethod) return
    if (paymentMethod === "cash" && !cashAmount) return
    if (paymentMethod === "online" && !onlineAmount) return
    if (paymentMethod === "cash+online" && (!cashAmount || !onlineAmount)) return
    if ((paymentMethod === "cash" || paymentMethod === "cash+online") && !cashType) return

    const paymentData = {
      paymentMethod,
      cashAmount:
        paymentMethod === "cash"
          ? Number.parseFloat(cashAmount)
          : paymentMethod === "cash+online"
            ? Number.parseFloat(cashAmount)
            : 0,
      onlineAmount:
        paymentMethod === "online"
          ? Number.parseFloat(onlineAmount)
          : paymentMethod === "cash+online"
            ? Number.parseFloat(onlineAmount)
            : 0,
      discountAmount: discountAmount ? Number.parseFloat(discountAmount) : 0,
      cashType: paymentMethod === "cash" || paymentMethod === "cash+online" ? cashType : "",
      onlineType: paymentMethod === "online" || paymentMethod === "cash+online" ? onlineType : "",
      createdAt: new Date().toISOString(),
    }

    onPaymentComplete(paymentData)
    // Reset form
    setPaymentMethod("")
    setTotalAmount("")
    setCashAmount("")
    setOnlineAmount("")
    setDiscountAmount("")
    setCashType("")
    setOnlineType("UPI")
  }

  const handleClose = () => {
    // Reset form when closing
    setPaymentMethod("")
    setTotalAmount("")
    setCashAmount("")
    setOnlineAmount("")
    setDiscountAmount("")
    setCashType("")
    setOnlineType("UPI")
    onClose()
  }

  if (!appointment) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-white to-green-50">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl text-gray-900">Payment Details</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Patient:</strong> {appointment.patientName}
                </div>
                <div>
                  <strong>Services:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {appointment.services?.map((service, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {service}
                      </Badge>
                    )) || appointment.services}
                  </div>
                </div>
                <div>
                  <strong>Doctor:</strong> {appointment.doctor}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-green-200">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <strong className="text-green-700">Service Charge: ₹{serviceCharge}</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="discountAmount">Discount Amount</Label>
            <Input
              id="discountAmount"
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="0"
              className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1 border-gray-300 focus:border-green-500">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="cash+online">Cash + Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "cash+online" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cashAmount">Cash Amount</Label>
                  <Input
                    id="cashAmount"
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <Label htmlFor="onlineAmount">Online Amount</Label>
                  <Input
                    id="onlineAmount"
                    type="number"
                    value={onlineAmount}
                    onChange={(e) => setOnlineAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cashType">Cash Type</Label>
                  <Select value={cashType} onValueChange={setCashType}>
                    <SelectTrigger className="mt-1 border-gray-300 focus:border-green-500">
                      <SelectValue placeholder="Select cash type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="onlineType">Online Type</Label>
                  <Select value={onlineType} onValueChange={setOnlineType}>
                    <SelectTrigger className="mt-1 border-gray-300 focus:border-green-500">
                      <SelectValue placeholder="Select online type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Debit Card">Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : paymentMethod === "cash" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cashAmount">Cash Amount</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder={`Suggested: ₹${serviceCharge}`}
                  className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div>
                <Label htmlFor="cashType">Cash Type</Label>
                <Select value={cashType} onValueChange={setCashType}>
                  <SelectTrigger className="mt-1 border-gray-300 focus:border-green-500">
                    <SelectValue placeholder="Select cash type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : paymentMethod === "online" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="onlineAmount">Online Amount</Label>
                <Input
                  id="onlineAmount"
                  type="number"
                  value={onlineAmount}
                  onChange={(e) => setOnlineAmount(e.target.value)}
                  placeholder={`Suggested: ₹${serviceCharge}`}
                  className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div>
                <Label htmlFor="onlineType">Online Type</Label>
                <Select value={onlineType} onValueChange={setOnlineType}>
                  <SelectTrigger className="mt-1 border-gray-300 focus:border-green-500">
                    <SelectValue placeholder="Select online type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {paymentMethod === "cash+online" && (
            <div className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
              Total: ₹{(Number.parseFloat(cashAmount) || 0) + (Number.parseFloat(onlineAmount) || 0)}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={
                !paymentMethod ||
                (paymentMethod === "cash" && (!cashAmount || !cashType)) ||
                (paymentMethod === "online" && !onlineAmount) ||
                (paymentMethod === "cash+online" && (!cashAmount || !onlineAmount || !cashType))
              }
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
            >
              Complete Payment
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-300 hover:bg-gray-50 bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
