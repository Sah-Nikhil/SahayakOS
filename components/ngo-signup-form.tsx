"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { retryOnConvexNotAuthenticated, waitForConvexToken } from "@/lib/clerk-convex-auth"
import { setNgoSession } from "@/lib/ngo-session"
import { cn } from "@/lib/utils"
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

export function NgoSignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { isLoaded: isUserLoaded, user } = useUser()
  const saveNgoProfile = useMutation(api.ngos.saveCurrentNgoProfile)
  const currentNgo = useQuery(api.ngos.getCurrentNgoProfile, isSignedIn ? {} : "skip")
  const [formData, setFormData] = React.useState<FormData>(defaultFormData)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const hydratedRef = React.useRef(false)

  const authEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? ""

  React.useEffect(() => {
    if (!currentNgo || hydratedRef.current) {
      return
    }

    setFormData(toFormData(currentNgo))
    hydratedRef.current = true
  }, [currentNgo])

  React.useEffect(() => {
    if (!isSignedIn || !isUserLoaded || hydratedRef.current || currentNgo) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      pocEmail: authEmail || prev.pocEmail,
    }))
  }, [authEmail, currentNgo, isSignedIn, isUserLoaded])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target
    if (id === "pocPhone") {
      setFormData((prev) => ({ ...prev, pocPhone: value.replace(/\D/g, "").slice(0, 10) }))
      return
    }

    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!isLoaded || !isSignedIn || !isUserLoaded || !user) {
      setError("Please sign in with Clerk before creating or editing your NGO profile.")
      return
    }

    if (!authEmail) {
      setError("Your Clerk account is missing an email address.")
      return
    }

    const normalizedEmail = authEmail.trim().toLowerCase()
    const normalizedPhone = formData.pocPhone.replace(/\D/g, "").slice(0, 10)

    if (
      !formData.ngoName.trim() ||
      !formData.registrationId.trim() ||
      !formData.hqLocation.trim() ||
      formData.coverageArea.length === 0 ||
      formData.focusAreas.length === 0
    ) {
      setError("Please fill in all required fields before continuing.")
      return
    }

    setIsSaving(true)
    try {
      await waitForConvexToken(getToken)
      const ngoId = await retryOnConvexNotAuthenticated(async () => {
        return await saveNgoProfile({
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
        })
      })

      setNgoSession({
        ngoId,
        email: normalizedEmail,
        name: formData.ngoName.trim(),
        phone: normalizedPhone || undefined,
      })

      router.replace("/ngo")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save NGO profile right now.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isLoaded || !isUserLoaded) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            <p className="text-sm text-muted-foreground">Loading your Clerk session...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid gap-6 p-6 md:p-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold">Register your NGO</h1>
              <p className="text-sm text-muted-foreground">
                Sign in with Clerk to create or update your NGO profile securely.
              </p>
            </div>
            <FieldGroup>
              <Field>
                <Button type="button" onClick={() => router.push("/ngo/login")}>
                  Sign in
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Need a Clerk account? <a href="/signup">Create one</a>
              </FieldDescription>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    )
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
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="pocEmail">Point of Contact Email</FieldLabel>
                <Input
                  id="pocEmail"
                  type="email"
                  value={authEmail}
                  readOnly
                  required
                />
                <FieldDescription>This email comes from your Clerk account.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="pocPhone">Contact Phone</FieldLabel>
                <Input
                  id="pocPhone"
                  type="tel"
                  value={formData.pocPhone}
                  onChange={handleChange}
                />
              </Field>

              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}

              <Field>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save NGO Profile"}
                </Button>
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>

              <FieldDescription className="text-center">
                Already registered? <a href="/ngo/login">Login</a>
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
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}

export default NgoSignupForm
