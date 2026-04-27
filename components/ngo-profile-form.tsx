"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormData = {
  name: string;
  registrationId: string;
  description: string;
  city: string;
  state: string;
  country: string;
  lat: string;
  lng: string;
  coverageAreas: string;
  focusAreas: string;
};

const emptyForm: FormData = {
  name: "",
  registrationId: "",
  description: "",
  city: "",
  state: "",
  country: "",
  lat: "",
  lng: "",
  coverageAreas: "",
  focusAreas: "",
};

const joinValues = (values: string[]) => values.join(", ");
const splitValues = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export function NgoProfileForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded } = useUser();
  const createNGO = useMutation(api.mutations.createNGO);
  const updateNGO = useMutation(api.mutations.updateNGO);

  // Server-side ownership lookup replaces localStorage session
  const ngo = useQuery(api.queries.getNgoByOwner);
  const isNgoLoading = ngo === undefined;

  const [formData, setFormData] = React.useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (hydratedRef.current || !ngo) {
      return;
    }

    setFormData({
      name: ngo.name,
      registrationId: ngo.registrationId,
      description: ngo.description ?? "",
      city: ngo.hqLocation.city,
      state: ngo.hqLocation.state ?? "",
      country: ngo.hqLocation.country,
      lat: String(ngo.hqLocation.lat),
      lng: String(ngo.hqLocation.lng),
      coverageAreas: joinValues(ngo.coverageAreas),
      focusAreas: joinValues(ngo.focusAreas),
    });
    hydratedRef.current = true;
  }, [ngo]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isLoaded || !isSignedIn || !isUserLoaded) {
      setError("Please sign in before editing your NGO profile.");
      return;
    }

    const lat = Number(formData.lat);
    const lng = Number(formData.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      registrationId: formData.registrationId.trim(),
      description: formData.description.trim() || undefined,
      hqLocation: {
        city: formData.city.trim(),
        state: formData.state.trim() || undefined,
        country: formData.country.trim(),
        lat,
        lng,
      },
      coverageAreas: splitValues(formData.coverageAreas),
      focusAreas: splitValues(formData.focusAreas),
    };

    if (!payload.name || !payload.registrationId || !payload.hqLocation.city || !payload.hqLocation.country) {
      setError("Please complete all required fields.");
      return;
    }

    if (payload.coverageAreas.length === 0 || payload.focusAreas.length === 0) {
      setError("Please provide at least one coverage area and focus area.");
      return;
    }

    setIsSaving(true);
    try {
      if (ngo) {
        await updateNGO({ ngoId: ngo._id, ...payload });
      } else {
        await createNGO(payload);
      }
      router.replace("/ngo");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save profile right now.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !isUserLoaded) {
    return (
      <div className={className} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            <p className="text-sm text-muted-foreground">Loading your Clerk session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className={className} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold">NGO Profile Setup</h1>
              <p className="text-sm text-muted-foreground">
                Sign in first to build the profile volunteers will see.
              </p>
              <Button type="button" onClick={() => router.push("/ngo/login")}>
                Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isNgoLoading) {
    return (
      <div className={className} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            <p className="text-sm text-muted-foreground">Loading your NGO profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">{ngo ? "Edit NGO profile" : "Create NGO profile"}</h1>
                <p className="text-sm text-muted-foreground">
                  This profile is what volunteers will see on their dashboard.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="name">Organization Name</FieldLabel>
                <Input id="name" value={formData.name} onChange={handleChange} required />
              </Field>

              <Field>
                <FieldLabel htmlFor="registrationId">Registration ID</FieldLabel>
                <Input
                  id="registrationId"
                  value={formData.registrationId}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What your NGO does"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="city">HQ City</FieldLabel>
                <Input id="city" value={formData.city} onChange={handleChange} required />
              </Field>

              <Field>
                <FieldLabel htmlFor="state">HQ State (optional)</FieldLabel>
                <Input id="state" value={formData.state} onChange={handleChange} />
              </Field>

              <Field>
                <FieldLabel htmlFor="country">HQ Country</FieldLabel>
                <Input id="country" value={formData.country} onChange={handleChange} required />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="lat">HQ Latitude</FieldLabel>
                  <Input id="lat" type="number" value={formData.lat} onChange={handleChange} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lng">HQ Longitude</FieldLabel>
                  <Input id="lng" type="number" value={formData.lng} onChange={handleChange} required />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="coverageAreas">Coverage Areas</FieldLabel>
                <Input
                  id="coverageAreas"
                  value={formData.coverageAreas}
                  onChange={handleChange}
                  placeholder="Delhi, NCR, Gurgaon"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="focusAreas">Focus Areas</FieldLabel>
                <Input
                  id="focusAreas"
                  value={formData.focusAreas}
                  onChange={handleChange}
                  placeholder="education, healthcare"
                  required
                />
              </Field>

              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}

              <Field>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : ngo ? "Update profile" : "Create profile"}
                </Button>
              </Field>
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
    </div>
  );
}

export default NgoProfileForm;
