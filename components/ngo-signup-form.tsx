"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useConvex, useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { setNgoSession } from "@/lib/ngo-session"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
  password: string
  confirmPassword: string
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
  password: "",
  confirmPassword: "",
}

export function NgoSignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const convex = useConvex()
  const createNgo = useMutation(api.ngos.createNgo)
  const [formData, setFormData] = React.useState<FormData>(defaultFormData)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const normalizedEmail = formData.pocEmail.trim().toLowerCase()
    const normalizedPhone = formData.pocPhone.replace(/\D/g, "").slice(0, 10)

    if (
      !formData.ngoName.trim() ||
      !formData.registrationId.trim() ||
      !formData.hqLocation.trim() ||
      formData.coverageArea.length === 0 ||
      formData.focusAreas.length === 0 ||
      !normalizedEmail ||
      !normalizedPhone ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all required fields before continuing.")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      // check existing by poc email
      const existingByEmail = await convex.query(api.ngos.getNgoByPocEmail, { email: normalizedEmail })
      if (existingByEmail) {
        setIsSubmitting(false)
        setError("An NGO with this contact email already exists. Please login.")
        return
      }

      // check existing by registrationId
      const existingByReg = await convex.query(api.ngos.getNgoByRegistrationId, { registrationId: formData.registrationId.trim() })
      if (existingByReg) {
        setIsSubmitting(false)
        setError("An NGO with this registration ID already exists. If this is your organization, please login.")
        return
      }

      const payload = {
        ngoName: formData.ngoName.trim(),
        registrationId: formData.registrationId.trim(),
        hqLocation: formData.hqLocation.trim(),
        coverageArea: formData.coverageArea,
        focusAreas: formData.focusAreas,
        pocDetails: {
          name: formData.pocName.trim() || formData.ngoName.trim(),
          email: normalizedEmail,
          phone: normalizedPhone || undefined,
        },
        isVerified: false,
      }

      const createdNgoId = await createNgo(payload)

      setNgoSession({
        ngoId: createdNgoId,
        email: normalizedEmail,
        name: formData.ngoName.trim(),
        phone: normalizedPhone,
      })

      router.push("/ngo")
    } catch (err) {
      setIsSubmitting(false)
      setError(err instanceof Error ? err.message : "Unable to continue right now.")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Register your NGO</h1>
              </div>

              <Field>
                <FieldLabel htmlFor="ngoName">Organization Name</FieldLabel>
                <Input
                  id="ngoName"
                  type="text"
                  value={formData.ngoName}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="registrationId">Registration ID</FieldLabel>
                <Input
                  id="registrationId"
                  type="text"
                  placeholder="REG-1234"
                  value={formData.registrationId}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="hqLocation">Headquarter Location</FieldLabel>
                <Input
                  id="hqLocation"
                  type="text"
                  placeholder="City, State"
                  value={formData.hqLocation}
                  onChange={handleChange}
                  required
                />
              </Field>

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

              <Field>
                <FieldLabel htmlFor="pocName">Point of Contact Name</FieldLabel>
                <Input
                  id="pocName"
                  type="text"
                  value={formData.pocName}
                  onChange={handleChange}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="pocEmail">Point of Contact Email</FieldLabel>
                <Input
                  id="pocEmail"
                  type="email"
                  placeholder="contact@ngo.org"
                  value={formData.pocEmail}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="pocPhone">Contact Phone</FieldLabel>
                <Input
                  id="pocPhone"
                  type="tel"
                  value={formData.pocPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pocPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </Field>

                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                  </div>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </Field>
              </div>

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Continuing..." : "Sign Up"}
                </Button>
              </Field>

              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>

              <FieldDescription className="text-center">
                Already have an NGO account? <a href="/ngo/login">Login</a>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="relative hidden bg-muted md:block">
            <img
              src="/vercel.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}

export default NgoSignupForm
