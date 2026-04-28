"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, useClerk, useUser } from "@clerk/nextjs"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Truck,
  Monitor,
  Webcam,
  Smartphone,
  CalendarClock,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { SKILL_OPTIONS } from "@/lib/form-options"
import { retryOnConvexNotAuthenticated } from "@/lib/clerk-convex-auth"
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
import { SingleSelect } from "@/components/ui/single-select"
import {
  AvailabilitySelector,
  defaultSlotsAvailability,
  type AvailabilityValue,
} from "@/components/availability-selector"

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
  const router = useRouter()
  const clerk = useClerk()
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: isUserLoaded, user } = useUser()
  const saveVolunteerProfile = useMutation(api.volunteers.saveCurrentVolunteerProfile)
  const syncCurrentVolunteerAccount = useMutation(api.volunteerAccounts.syncCurrentVolunteerAccount)
  const currentContext = useQuery(api.volunteerAccounts.getCurrentVolunteerContext)
  const [formData, setFormData] = React.useState<FormData>(() => {
    const session = getVolunteerSession()
    return {
      ...defaultFormData,
      name: session.name ?? "",
      email: session.email ?? "",
      phone: session.phone ?? "",
    }
  })
  const [isSaving, setIsSaving] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const hydratedContextRef = React.useRef(false)
  const syncedAccountRef = React.useRef(false)

  React.useEffect(() => {
    if (!currentContext || hydratedContextRef.current) {
      return
    }

    if (currentContext.volunteer) {
      // The form should hydrate once when Convex data arrives.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(toFormData(currentContext.volunteer))
    } else if (currentContext.account) {
      setFormData((prev) => ({
        ...prev,
        name: currentContext.account?.name ?? prev.name,
        email: currentContext.account?.email ?? prev.email,
        phone: currentContext.account?.phone ?? prev.phone,
      }))
    }

    hydratedContextRef.current = true
  }, [currentContext])

  React.useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      !isUserLoaded ||
      !user ||
      currentContext ||
      syncedAccountRef.current
    ) {
      return
    }

    syncedAccountRef.current = true
    const session = getVolunteerSession()
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      session.email

    void retryOnConvexNotAuthenticated(async () => {
      await syncCurrentVolunteerAccount({
        ...(email ? { email } : {}),
        ...(session.name ? { name: session.name } : {}),
        ...(session.phone ? { phone: session.phone } : {}),
      })
    }).catch((error) => {
      syncedAccountRef.current = false
      setErrorMessage(error instanceof Error ? error.message : "Unable to load your profile right now.")
    })
  }, [currentContext, isLoaded, isSignedIn, isUserLoaded, syncCurrentVolunteerAccount, user])

  const handleLogout = async () => {
    setErrorMessage(null)
    setIsLoggingOut(true)
    try {
      setVolunteerSession({})
      await clerk.signOut({ redirectUrl: "/login" })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to log out right now.")
      setIsLoggingOut(false)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      const volunteerId = await saveVolunteerProfile(payload)
      setVolunteerSession({
        volunteerId,
        email: formData.email.trim().toLowerCase(),
        name: payload.name,
        phone: payload.contactDetails.phone,
      })

      setIsSaving(false)
      window.location.assign("/")
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
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">Want to browse the main map now?</p>
          <p className="text-sm text-muted-foreground">
            You can jump to the main map/job listing page at any time.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => router.push("/")}>
            Go to main map
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-50 focus-within:z-100 shadow-[6px_6px_20px] shadow-foreground/3">
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

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-40 focus-within:z-100 shadow-[6px_6px_20px] shadow-foreground/3">
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
                    readOnly
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

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-30 focus-within:z-100 shadow-[6px_6px_20px] shadow-foreground/3">
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
                  options={SKILL_OPTIONS}
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

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-20 focus-within:z-100 shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Availability
            </CardTitle>
            <CardDescription>
              Set when you&apos;re available to volunteer each week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilitySelector
              value={formData.availability}
              onChange={(val) => setFormData((prev) => ({ ...prev, availability: val }))}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-10 focus-within:z-100 shadow-[6px_6px_20px] shadow-foreground/3">
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
                <SingleSelect
                  id="transport"
                  ariaLabel="Transport"
                  value={formData.transport}
                  options={TRANSPORT_OPTIONS}
                  onChange={(transport) => setFormData((prev) => ({ ...prev, transport }))}
                />
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
