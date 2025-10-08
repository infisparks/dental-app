import { ref, push, set, get, onValue, update, remove, off } from "firebase/database"
import { database } from "./firebase"

export interface Appointment {
  note: string | undefined
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

    // Create reference to appointments for the specific date
    const appointmentsRef = ref(database, `appointments/${year}/${month}/${day}`)

    // Push new appointment (this generates a unique ID)
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

// Get all appointments for a specific date
export const getAppointmentsByDate = async (year: string, month: string, day?: string) => {
  try {
    let appointmentsRef

    if (day) {
      // Get appointments for specific day
      appointmentsRef = ref(database, `appointments/${year}/${month}/${day}`)
    } else {
      // Get appointments for entire month
      appointmentsRef = ref(database, `appointments/${year}/${month}`)
    }

    const snapshot = await get(appointmentsRef)

    if (!snapshot.exists()) {
      return []
    }

    const appointments: Appointment[] = []

    if (day) {
      // Single day data
      const dayData = snapshot.val()
      Object.entries(dayData || {}).forEach(([id, data]: [string, any]) => {
        appointments.push({
          id,
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      })
    } else {
      // Month data - iterate through days
      const monthData = snapshot.val()
      Object.entries(monthData || {}).forEach(([dayKey, dayData]: [string, any]) => {
        Object.entries(dayData || {}).forEach(([id, data]: [string, any]) => {
          appointments.push({
            id,
            ...data,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          })
        })
      })
    }

    // Sort by creation date (newest first)
    return appointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error("Error getting appointments:", error)
    throw error
  }
}

// Get all appointments (for dashboard stats)
export const getAllAppointments = async () => {
  try {
    const appointmentsRef = ref(database, "appointments")
    const snapshot = await get(appointmentsRef)

    if (!snapshot.exists()) {
      return []
    }

    const appointments: Appointment[] = []
    const allData = snapshot.val()

    // Iterate through years -> months -> days -> appointments
    Object.entries(allData || {}).forEach(([year, yearData]: [string, any]) => {
      Object.entries(yearData || {}).forEach(([month, monthData]: [string, any]) => {
        Object.entries(monthData || {}).forEach(([day, dayData]: [string, any]) => {
          Object.entries(dayData || {}).forEach(([id, data]: [string, any]) => {
            appointments.push({
              id,
              ...data,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            })
          })
        })
      })
    })

    // Sort by creation date (newest first)
    return appointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error("Error getting all appointments:", error)
    throw error
  }
}

// Get appointments by status
export const getAppointmentsByStatus = async (status: "pending" | "completed") => {
  try {
    const allAppointments = await getAllAppointments()
    return allAppointments.filter((apt) => apt.status === status)
  } catch (error) {
    console.error("Error getting appointments by status:", error)
    throw error
  }
}

// Update an appointment
export const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
  try {
    // First, find the appointment to get its date
    const allAppointments = await getAllAppointments()
    const appointment = allAppointments.find((apt) => apt.id === appointmentId)

    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Get the date parts from the appointment's creation date
    const createdDate = new Date(appointment.createdAt)
    const { year, month, day } = getDateParts(createdDate)

    // Create reference to the specific appointment
    const appointmentRef = ref(database, `appointments/${year}/${month}/${day}/${appointmentId}`)

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await update(appointmentRef, updateData)
  } catch (error) {
    console.error("Error updating appointment:", error)
    throw error
  }
}

// Delete an appointment
export const deleteAppointment = async (appointmentId: string) => {
  try {
    // First, find the appointment to get its date
    const allAppointments = await getAllAppointments()
    const appointment = allAppointments.find((apt) => apt.id === appointmentId)

    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Get the date parts from the appointment's creation date
    const createdDate = new Date(appointment.createdAt)
    const { year, month, day } = getDateParts(createdDate)

    // Create reference to the specific appointment
    const appointmentRef = ref(database, `appointments/${year}/${month}/${day}/${appointmentId}`)

    await remove(appointmentRef)
  } catch (error) {
    console.error("Error deleting appointment:", error)
    throw error
  }
}

// Real-time listener for all appointments
export const subscribeToAppointments = (callback: (appointments: Appointment[]) => void) => {
  const appointmentsRef = ref(database, "appointments")

  const unsubscribe = onValue(appointmentsRef, (snapshot) => {
    const appointments: Appointment[] = []

    if (snapshot.exists()) {
      const allData = snapshot.val()

      // Iterate through years -> months -> days -> appointments
      Object.entries(allData || {}).forEach(([year, yearData]: [string, any]) => {
        Object.entries(yearData || {}).forEach(([month, monthData]: [string, any]) => {
          Object.entries(monthData || {}).forEach(([day, dayData]: [string, any]) => {
            Object.entries(dayData || {}).forEach(([id, data]: [string, any]) => {
              appointments.push({
                id,
                ...data,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
              })
            })
          })
        })
      })
    }

    // Sort by creation date (newest first)
    const sortedAppointments = appointments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    callback(sortedAppointments)
  })

  return () => off(appointmentsRef, "value", unsubscribe)
}

// Real-time listener for appointments by status
export const subscribeToAppointmentsByStatus = (
  callback: (appointments: Appointment[]) => void,
  status?: "pending" | "completed",
) => {
  return subscribeToAppointments((appointments) => {
    const filteredAppointments = status ? appointments.filter((apt) => apt.status === status) : appointments
    callback(filteredAppointments)
  })
}

// Real-time listener for appointments on a specific date
export const subscribeToAppointmentsByDate = (
  callback: (appointments: Appointment[]) => void,
  year: string,
  month: string,
  day: string,
) => {
  const dayRef = ref(database, `appointments/${year}/${month}/${day}`)

  const unsubscribe = onValue(dayRef, (snapshot) => {
    const appointments: Appointment[] = []

    if (snapshot.exists()) {
      const dayData = snapshot.val()
      Object.entries(dayData || {}).forEach(([id, data]: [string, any]) => {
        appointments.push({
          id,
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      })
    }

    // Sort by creation date (newest first)
    const sortedAppointments = appointments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    callback(sortedAppointments)
  })

  return () => off(dayRef, "value", unsubscribe)
}

// Get appointments for date range
export const getAppointmentsByDateRange = async (startDate: Date, endDate: Date) => {
  try {
    const allAppointments = await getAllAppointments()

    return allAppointments.filter((apt) => {
      const appointmentDate = new Date(apt.createdAt)
      return appointmentDate >= startDate && appointmentDate <= endDate
    })
  } catch (error) {
    console.error("Error getting appointments by date range:", error)
    throw error
  }
}

// Subscribe to appointments by date range
export const subscribeToAppointmentsByDateRange = (
  callback: (appointments: Appointment[]) => void,
  startDate: Date,
  endDate: Date,
  status?: "pending" | "completed",
) => {
  return subscribeToAppointments((appointments) => {
    let filteredAppointments = appointments.filter((apt) => {
      const appointmentDate = new Date(apt.createdAt)
      return appointmentDate >= startDate && appointmentDate <= endDate
    })

    if (status) {
      filteredAppointments = filteredAppointments.filter((apt) => apt.status === status)
    }

    callback(filteredAppointments)
  })
}
