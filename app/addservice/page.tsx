"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Plus, Edit, Trash2, Check, X, Clock } from "lucide-react"

// --- CONSOLIDATED FIREBASE IMPORTS AND SETUP (MOVED TO lib/firebase) ---
// Import only the necessary items from the centralized file
import { database, ref, set, onValue, off, remove, ServiceItem } from "@/lib/firebase" // ASSUMING lib/firebase.ts path

// --- INTERFACE DEFINITIONS ---
// Use the interface exported from the firebase file
type EditingState = {
    isEditing: boolean,
    originalName: string,
    currentPrice: number
}

// --- UTILITY FUNCTIONS FOR DYNAMIC DATA (REFACTORED) ---

/**
 * Utility to get the slug for Firebase key
 */
const getServiceSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

/**
 * Adds a real-time listener for the services master list.
 * Path: /services_master/
 */
const subscribeToServicesMaster = (callback: (services: ServiceItem[]) => void) => {
    // Check if database is initialized before subscribing
    if (!database) {
        console.error("Firebase database not available.")
        return () => {}
    }
    const servicesRef = ref(database, "services_master")

    const listener = onValue(servicesRef, (snapshot) => {
        const services: ServiceItem[] = []

        if (snapshot.exists()) {
            const servicesData = snapshot.val()
            Object.values(servicesData || {}).forEach((data: any) => {
                // Ensure data structure matches ServiceItem
                if (data && typeof data.name === 'string' && typeof data.price === 'number') {
                    services.push({
                        name: data.name,
                        charge: data.price, // Assuming 'price' in DB maps to 'charge' in interface
                    })
                }
            })
        }
        
        // Sort services alphabetically by name
        const sortedServices = services.sort((a, b) => a.name.localeCompare(b.name))
        callback(sortedServices)
    })

    return () => off(servicesRef, "value", listener)
}

/**
 * Saves or updates a service.
 */
const updateOrCreateService = async (serviceName: string, price: number) => {
    if (!database) throw new Error("Database not available")
    try {
      const slug = getServiceSlug(serviceName)
      const serviceRef = ref(database, `services_master/${slug}`)

      await set(serviceRef, {
        name: serviceName,
        price: price,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error saving service:", error)
      throw error
    }
}

/**
 * Deletes a service.
 */
const deleteService = async (serviceName: string) => {
    if (!database) throw new Error("Database not available")
    try {
      const slug = getServiceSlug(serviceName)
      const serviceRef = ref(database, `services_master/${slug}`)
      await remove(serviceRef)
    } catch (error) {
      console.error("Error deleting service:", error)
      throw error
    }
}


// --- Component ---
export default function AddServicePage() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<EditingState | null>(null) // State for the currently editing service
  const [newServiceName, setNewServiceName] = useState("")
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('')
  const [isSaving, setIsSaving] = useState(false)
  const [editPrice, setEditPrice] = useState<number | ''>('');


  // Real-time listener for services
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToServicesMaster((fetchedServices) => {
      setServices(fetchedServices)
      setIsLoading(false)
    })

    return () => {
        unsubscribe()
    }
  }, [])

  // --- Handlers for Add New Service ---
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newServiceName.trim() || !newServicePrice || newServicePrice <= 0) {
        toast.error("Please enter a valid name and price.")
        return
    }

    // Check for duplicate name
    if (services.some(s => s.name.toLowerCase() === newServiceName.trim().toLowerCase())) {
        toast.error("A service with this name already exists.")
        return
    }

    setIsSaving(true)
    try {
        await updateOrCreateService(newServiceName.trim(), Number(newServicePrice))
        toast.success(`Service "${newServiceName}" added successfully.`)
        setNewServiceName("")
        setNewServicePrice("")
    } catch (error) {
        toast.error("Failed to add service.")
        console.error("Error adding service:", error)
    } finally {
        setIsSaving(false)
    }
  }

  // --- Handlers for Update/Delete Service ---
  const startEditing = (service: ServiceItem) => {
    setEditing({ isEditing: true, originalName: service.name, currentPrice: service.charge })
    setEditPrice(service.charge)
  }

  const cancelEditing = () => {
    setEditing(null)
    setEditPrice('')
  }

  const handleUpdatePrice = async (serviceName: string) => {
    if (!editPrice || Number(editPrice) <= 0) {
        toast.error("Price must be a positive number.")
        return
    }

    setIsSaving(true)
    try {
        await updateOrCreateService(serviceName, Number(editPrice))
        toast.success(`Price for "${serviceName}" updated successfully.`)
        setEditing(null)
    } catch (error) {
        toast.error(`Failed to update price for ${serviceName}.`)
        console.error("Error updating service:", error)
    } finally {
        setIsSaving(false)
    }
  }

  const handleDeleteService = async (serviceName: string) => {
    // Custom modal check instead of window.confirm
    const confirmation = window.prompt(`Type DELETE to confirm removing service: ${serviceName}`)
    
    if (confirmation && confirmation.toUpperCase() === 'DELETE') {
        setIsSaving(true)
        try {
            await deleteService(serviceName)
            toast.success(`Service "${serviceName}" deleted.`)
        } catch (error) {
            toast.error(`Failed to delete service ${serviceName}.`)
            console.error("Error deleting service:", error)
        } finally {
            setIsSaving(false)
        }
    } else if (confirmation !== null) {
         // User typed something but not DELETE
        toast.info("Deletion cancelled.")
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 border-b pb-2 mb-4">Manage Clinic Services</h1>

        {/* --- 1. Add New Service Form --- */}
        <Card className="shadow-lg border border-blue-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-blue-600">
                    <Plus className="w-5 h-5" /> Add New Service
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Label htmlFor="serviceName" className="text-gray-700 font-medium">Service Name *</Label>
                        <Input
                            id="serviceName"
                            placeholder="e.g., Teeth Cleaning"
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            className="mt-1"
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <Label htmlFor="price" className="text-gray-700 font-medium">Price (₹) *</Label>
                        <Input
                            id="price"
                            type="number"
                            placeholder="1500"
                            value={newServicePrice}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewServicePrice(val > 0 ? val : '')
                            }}
                            min="1"
                            className="mt-1"
                            disabled={isSaving}
                        />
                    </div>
                    <Button 
                        type="submit" 
                        className="md:col-span-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800" 
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : "Save Service"}
                    </Button>
                </form>
            </CardContent>
        </Card>

        {/* --- 2. Service List --- */}
        <Card className="shadow-lg border border-gray-200">
            <CardHeader>
                <CardTitle className="text-xl text-gray-800">Existing Services ({services.length})</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center p-4 text-gray-500 flex items-center justify-center gap-2">
                         <Clock className="w-4 h-4 animate-spin"/> Loading services...
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center p-4 text-yellow-600 flex items-center justify-center gap-2 bg-yellow-50 rounded-lg">
                        <AlertCircle className="w-5 h-5"/> No services found. Add a new service above.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-gray-700">Service Name</TableHead>
                                    <TableHead className="w-[150px] text-right font-semibold text-gray-700">Price (₹)</TableHead>
                                    <TableHead className="w-[150px] text-center font-semibold text-gray-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.map((service) => (
                                    <TableRow key={service.name} className="hover:bg-blue-50 transition-colors">
                                        <TableCell className="font-medium">
                                            {service.name}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editing?.originalName === service.name && editing.isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editPrice}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setEditPrice(val > 0 ? val : '')
                                                    }}
                                                    className="w-full text-right h-9"
                                                    min="1"
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <span className="font-bold text-green-700">₹{service.charge}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center space-x-2">
                                            {editing?.originalName === service.name && editing.isEditing ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleUpdatePrice(service.name)}
                                                        className="text-white bg-green-500 hover:bg-green-600 p-1 h-8 w-8 rounded-full"
                                                        disabled={isSaving || Number(editPrice) === service.charge}
                                                        title="Confirm Update"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={cancelEditing}
                                                        className="text-white bg-red-500 hover:bg-red-600 p-1 h-8 w-8 rounded-full"
                                                        disabled={isSaving}
                                                        title="Cancel Edit"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => startEditing(service)}
                                                        className="text-blue-600 hover:bg-blue-100 p-1 h-8 w-8 rounded-full"
                                                        disabled={isSaving}
                                                        title="Edit Price"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteService(service.name)}
                                                        className="text-red-600 hover:bg-red-100 p-1 h-8 w-8 rounded-full"
                                                        disabled={isSaving}
                                                        title="Delete Service"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  )
}