"use client"

import * as React from "react"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  Truck,
  Monitor,
  Webcam,
  Smartphone,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { getVolunteerSession, setVolunteerSession } from "@/lib/volunteer-session"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  AvailabilitySelector,
  defaultSlotsAvailability,
  type AvailabilityValue,
} from "@/components/availability-selector"

const SKILLS_OPTIONS = [
  { label: "Plumbing", value: "plumbing" },
  { label: "Electrical Work", value: "electrical" },
  { label: "Carpentry", value: "carpentry" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Cooking", value: "cooking" },
  { label: "Gardening", value: "gardening" },
  { label: "Driving", value: "driving" },
  { label: "Nursing", value: "nursing" },
  { label: "Teaching", value: "teaching" },
  { label: "IT Support", value: "it_support" },
]

const TRANSPORT_OPTIONS = [
  { label: "Bike", value: "bike" },
  { label: "Car", value: "car" },
  { label: "Public Transport", value: "public_transport" },
  { label: "None", value: "none" },
]

const LANGUAGES_OPTIONS = [
  { label: "English", value: "english" },
  { label: "Hindi", value: "hindi" },
  { label: "Bengali", value: "bengali" },
  { label: "Telugu", value: "telugu" },
  { label: "Marathi", value: "marathi" },
  { label: "Tamil", value: "tamil" },
  { label: "Urdu", value: "urdu" },
  { label: "Gujarati", value: "gujarati" },
  { label: "Kannada", value: "kannada" },
  { label: "Odia", value: "odia" },
  { label: "Malayalam", value: "malayalam" },
  { label: "Punjabi", value: "punjabi" },
  { label: "Assamese", value: "assamese" },
]

type FormData = {
  name: string
  age: string
  location: string
  email: string
  phone: string
  skills: string[]
  availability: AvailabilityValue
  languages: string[]
  transport: string
  devices: {
    cam: boolean
    pc: boolean
    smartphone: boolean
  }
}

const defaultFormData: FormData = {
  name: "",
  age: "",
  location: "",
  email: "",
  phone: "",
  skills: [],
  availability: { mode: "slots", days: defaultSlotsAvailability() },
  languages: [],
  transport: "none",
  devices: {
    cam: false,
    pc: false,
    smartphone: false,
  },
}

const toFormData = (volunteer: Doc<"volunteers">): FormData => ({
  name: volunteer.name,
  age: String(volunteer.age),
  location: volunteer.location,
  email: volunteer.contactDetails.email,
  phone: volunteer.contactDetails.phone ?? "",
  skills: volunteer.skills,
  availability: volunteer.availability ?? { mode: "slots", days: defaultSlotsAvailability() },
  languages: volunteer.languagesSpoken,
  transport: volunteer.hasTransport ? "bike" : "none",
  devices: {
    cam: volunteer.devices.includes("camera"),
    pc: volunteer.devices.includes("pc"),
    smartphone: volunteer.devices.includes("smartphone"),
  },
})

export default function ProfilePage() {
  const createVolunteer = useMutation(api.volunteers.createVolunteer)
  const updateVolunteer = useMutation(api.volunteers.updateVolunteer)
  const [volunteerId, setVolunteerId] = React.useState<Id<"volunteers"> | null>(null)
  const [formData, setFormData] = React.useState<FormData>(defaultFormData)
  const [isSaving, setIsSaving] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const volunteer = useQuery(
    api.volunteers.getVolunteerById,
    volunteerId ? { volunteerId } : "skip",
  )

  React.useEffect(() => {
    const session = getVolunteerSession()
    setFormData((prev) => ({
      ...prev,
      name: session.name ?? prev.name,
      email: session.email ?? prev.email,
      phone: session.phone ?? prev.phone,
    }))

    if (session.volunteerId) {
      setVolunteerId(session.volunteerId as Id<"volunteers">)
    }
  }, [])

  React.useEffect(() => {
    if (!volunteer) {
      return
    }

    setFormData(toFormData(volunteer))
    setVolunteerSession({
      volunteerId: volunteer._id,
      email: volunteer.contactDetails.email,
      name: volunteer.name,
      phone: volunteer.contactDetails.phone,
    })
  }, [volunteer])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target
    if (id === "phone") {
      setFormData((prev) => ({ ...prev, phone: value.replace(/\D/g, "").slice(0, 10) }))
      return
    }

    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleToggleDevice = (device: "cam" | "pc" | "smartphone") => {
    setFormData((prev) => ({
      ...prev,
      devices: { ...prev.devices, [device]: !prev.devices[device] },
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)

    const age = Number(formData.age)

    if (!Number.isFinite(age)) {
      setErrorMessage("Please enter a valid numeric value for age.")
      return
    }

    setIsSaving(true)
    const payload = {
      name: formData.name.trim(),
      age,
      location: formData.location.trim(),
      skills: formData.skills,
      contactDetails: {
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
      },
      availability: formData.availability,
      languagesSpoken: formData.languages,
      hasTransport: formData.transport !== "none",
      devices: [
        ...(formData.devices.cam ? (["camera"] as const) : []),
        ...(formData.devices.pc ? (["pc"] as const) : []),
        ...(formData.devices.smartphone ? (["smartphone"] as const) : []),
      ],
    }

    try {
      if (volunteerId) {
        const updatedVolunteer = await updateVolunteer({
          volunteerId,
          ...payload,
        })

        if (updatedVolunteer) {
          setVolunteerSession({
            volunteerId: updatedVolunteer._id,
            email: updatedVolunteer.contactDetails.email,
            name: updatedVolunteer.name,
            phone: updatedVolunteer.contactDetails.phone,
          })
        }
      } else {
        const createdVolunteerId = await createVolunteer(payload)
        setVolunteerId(createdVolunteerId)
        setVolunteerSession({
          volunteerId: createdVolunteerId,
          email: payload.contactDetails.email,
          name: payload.name,
          phone: payload.contactDetails.phone,
        })
      }

      setStatusMessage("Profile saved successfully.")
      setIsSaving(false)
    } catch (error) {
      setIsSaving(false)
      setErrorMessage(error instanceof Error ? error.message : "Unable to save profile right now.")
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-10 px-4 md:px-6">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Complete Your Profile</h1>
        <p className="text-lg text-muted-foreground mx-auto max-w-2xl">
          Help us match you with the best opportunities by telling us about yourself.
        </p>
        {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-50 shadow-[6px_6px_20px] shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic details to help people know who you are.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="age">Age</FieldLabel>
                  <Input
                    id="age"
                    type="number"
                    min="15"
                    max="120"
                    placeholder="25"
                    value={formData.age}
                    onChange={handleChange}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="location">Location</FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      className="pl-9"
                      placeholder="City, Country"
                      value={formData.location}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-40 shadow-[6px_6px_20px] shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    className="pl-9"
                    minLength={10}
                    maxLength={10}
                    placeholder="1234567890"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-30 shadow-[6px_6px_20px] shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Expertise & Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="space-y-6">
              <Field>
                <FieldLabel>Skills</FieldLabel>
                <MultiSelect
                  options={SKILLS_OPTIONS}
                  selected={formData.skills}
                  onChange={(selected) => setFormData((prev) => ({ ...prev, skills: selected }))}
                  placeholder="Select your skills..."
                />
                <FieldDescription>Select all skills that apply to you.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Languages Spoken</FieldLabel>
                <MultiSelect
                  options={LANGUAGES_OPTIONS}
                  selected={formData.languages}
                  onChange={(selected) => setFormData((prev) => ({ ...prev, languages: selected }))}
                  placeholder="Select languages..."
                />
                <FieldDescription>Select all languages you can communicate in.</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-20 shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Availability
            </CardTitle>
            <CardDescription>
              Set when you're available to volunteer each week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilitySelector
              value={formData.availability}
              onChange={(val) => setFormData((prev) => ({ ...prev, availability: val }))}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-10 shadow-[6px_6px_20px] shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Resources & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-8 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="transport">Transport</FieldLabel>
                <select
                  id="transport"
                  className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={formData.transport}
                  onChange={handleChange}
                >
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <FieldSet>
                <FieldLegend variant="label">Devices Available</FieldLegend>
                <div className="flex flex-wrap gap-4">
                  <Button
                    type="button"
                    variant={formData.devices.cam ? "default" : "outline"}
                    className="rounded-full gap-2 px-6"
                    onClick={() => handleToggleDevice("cam")}
                  >
                    <Webcam className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant={formData.devices.pc ? "default" : "outline"}
                    className="rounded-full gap-2 px-6"
                    onClick={() => handleToggleDevice("pc")}
                  >
                    <Monitor className="h-4 w-4" />
                    PC / Laptop
                  </Button>
                  <Button
                    type="button"
                    variant={formData.devices.smartphone ? "default" : "outline"}
                    className="rounded-full gap-2 px-6"
                    onClick={() => handleToggleDevice("smartphone")}
                  >
                    <Smartphone className="h-4 w-4" />
                    Smartphone
                  </Button>
                </div>
              </FieldSet>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4 pb-20">
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto px-12 rounded-full text-lg font-semibold shadow-lg shadow-primary/20"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  )
}
