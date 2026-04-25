"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Users, MapPin, Mail, Phone, Globe } from "lucide-react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { getNgoSession, setNgoSession } from "@/lib/ngo-session"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { MultiSelect } from "@/components/ui/multi-select"

const COVERAGE_OPTIONS = [
  { label: "Local", value: "local" },
  { label: "City", value: "city" },
  { label: "State", value: "state" },
  { label: "National", value: "national" },
  { label: "International", value: "international" },
]

const FOCUS_OPTIONS = [
  { label: "Disaster Relief", value: "disaster_relief" },
  { label: "Medical Aid", value: "medical_aid" },
  { label: "Food & Shelter", value: "food_shelter" },
  { label: "Education", value: "education" },
  { label: "Logistics", value: "logistics" },
  { label: "Rescue", value: "rescue" },
  { label: "Counseling", value: "counseling" },
]

type FormData = {
  ngoName: string
  registrationId: string
  hqLocation: string
  coverageArea: string[]
  focusAreas: string[]
  pocName: string
  pocEmail: string
  pocPhone: string
}

const defaultFormData: FormData = {
  ngoName: "",
  registrationId: "",
  hqLocation: "",
  coverageArea: [],
  focusAreas: [],
  pocName: "",
  pocEmail: "",
  pocPhone: "",
}

const toFormData = (ngo: Doc<"ngos">): FormData => ({
  ngoName: ngo.ngoName,
  registrationId: ngo.registrationId,
  hqLocation: ngo.hqLocation,
  coverageArea: ngo.coverageArea ?? [],
  focusAreas: ngo.focusAreas ?? [],
  pocName: ngo.pocDetails?.name ?? "",
  pocEmail: ngo.pocDetails?.email ?? "",
  pocPhone: ngo.pocDetails?.phone ?? "",
})

export default function NgoProfilePage() {
  const router = useRouter()
  const createNgo = useMutation(api.ngos.createNgo)
  const updateNgo = useMutation(api.ngos.updateNgo)
  const [ngoId, setNgoId] = React.useState<Id<"ngos"> | null>(null)
  const [formData, setFormData] = React.useState<FormData>(defaultFormData)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const ngo = useQuery(
    api.ngos.getNgoByIdForProfile,
    ngoId ? { ngoId } : "skip",
  )

  React.useEffect(() => {
    const session = getNgoSession()
    const timeoutId = window.setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        ngoName: session.name ?? prev.ngoName,
        pocEmail: session.email ?? prev.pocEmail,
        pocPhone: session.phone ?? prev.pocPhone,
      }))

      if (session.ngoId) {
        setNgoId(session.ngoId as Id<"ngos">)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  React.useEffect(() => {
    if (!ngo) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const currentSession = getNgoSession()
      setFormData(toFormData(ngo))
      setNgoSession({
        ngoId: ngo._id,
        email: ngo.pocDetails?.email ?? currentSession.email,
        name: ngo.ngoName,
        phone: ngo.pocDetails?.phone ?? currentSession.phone,
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [ngo])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    setIsSaving(true)
    const payload = {
      ngoName: formData.ngoName.trim(),
      registrationId: formData.registrationId.trim(),
      hqLocation: formData.hqLocation.trim(),
      coverageArea: formData.coverageArea,
      focusAreas: formData.focusAreas,
      pocDetails: {
        name: formData.pocName.trim(),
        email: formData.pocEmail.trim().toLowerCase(),
        phone: formData.pocPhone.trim() || undefined,
      },
    }

    try {
      if (ngoId) {
        const updatedNgo = await updateNgo({ ngoId, ...payload })

        if (updatedNgo) {
          setNgoSession({
            ngoId: updatedNgo._id,
            email: updatedNgo.pocDetails?.email,
            name: updatedNgo.ngoName,
            phone: updatedNgo.pocDetails?.phone,
          })
        }
      } else {
        const createdNgoId = await createNgo(payload)
        setNgoId(createdNgoId)
        setNgoSession({
          ngoId: createdNgoId,
          email: payload.pocDetails.email,
          name: payload.ngoName,
          phone: payload.pocDetails.phone,
        })
      }

      setIsSaving(false)
      router.replace("/")
    } catch (error) {
      setIsSaving(false)
      setErrorMessage(error instanceof Error ? error.message : "Unable to save NGO profile right now.")
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-10 px-4 md:px-6">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">NGO Profile</h1>
        <p className="text-lg text-muted-foreground mx-auto max-w-2xl">
          Tell volunteers about your organisation so they can find and help you.
        </p>
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-50 focus-within:z-100 shadow-[6px_6px_20px] shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Organization Details
            </CardTitle>
            <CardDescription>Basic information about your NGO.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ngoName">Organization Name</FieldLabel>
                <Input
                  id="ngoName"
                  placeholder="Helping Hands"
                  value={formData.ngoName}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="registrationId">Registration ID</FieldLabel>
                <Input
                  id="registrationId"
                  placeholder="REG-1234"
                  value={formData.registrationId}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="hqLocation">Headquarter Location</FieldLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="hqLocation"
                    className="pl-9"
                    placeholder="City, State"
                    value={formData.hqLocation}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-40 focus-within:z-100 shadow-[6px_6px_20px] shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Point of Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pocName">Contact Person</FieldLabel>
                <Input
                  id="pocName"
                  placeholder="Jane Doe"
                  value={formData.pocName}
                  onChange={handleChange}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="pocEmail">Contact Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pocEmail"
                    type="email"
                    className="pl-9"
                    placeholder="contact@ngo.org"
                    value={formData.pocEmail}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="pocPhone">Contact Phone</FieldLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pocPhone"
                    type="tel"
                    className="pl-9"
                    placeholder="1234567890"
                    value={formData.pocPhone}
                    onChange={handleChange}
                  />
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-visible relative z-30 focus-within:z-100 shadow-[6px_6px_20px] shadow-foreground/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Coverage & Focus Areas
            </CardTitle>
            <CardDescription>Where you operate and what you focus on.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="space-y-6">
              <Field>
                <FieldLabel>Coverage Area</FieldLabel>
                <MultiSelect
                  options={COVERAGE_OPTIONS}
                  selected={formData.coverageArea}
                  onChange={(selected) => setFormData((prev) => ({ ...prev, coverageArea: selected }))}
                  placeholder="Select coverage areas..."
                />
                <FieldDescription>Areas where your NGO can operate.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Focus Areas</FieldLabel>
                <MultiSelect
                  options={FOCUS_OPTIONS}
                  selected={formData.focusAreas}
                  onChange={(selected) => setFormData((prev) => ({ ...prev, focusAreas: selected }))}
                  placeholder="Select focus areas..."
                />
                <FieldDescription>Primary focus areas for your organisation.</FieldDescription>
              </Field>
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
            {isSaving ? "Saving..." : "Save NGO Profile"}
          </Button>
        </div>
      </form>
    </div>
  )
}
