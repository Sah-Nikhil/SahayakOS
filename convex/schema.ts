import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const deviceValidator = v.union(
  v.literal("camera"),
  v.literal("pc"),
  v.literal("smartphone"),
);

const urgencyValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const listingStatusValidator = v.union(
  v.literal("open"),
  v.literal("filled"),
  v.literal("closed"),
);

const dayOfWeekValidator = v.union(
  v.literal("sunday"),
  v.literal("monday"),
  v.literal("tuesday"),
  v.literal("wednesday"),
  v.literal("thursday"),
  v.literal("friday"),
  v.literal("saturday"),
);

const timeSlotValidator = v.object({
  start: v.string(), // "HH:MM" 24h format
  end: v.string(),   // "HH:MM" 24h format
});

const dayAvailabilityValidator = v.object({
  day: dayOfWeekValidator,
  enabled: v.boolean(),
  slots: v.array(timeSlotValidator),
});

export const availabilityValidator = v.union(
  v.object({
    mode: v.literal("slots"),
    days: v.array(dayAvailabilityValidator),
  }),
  v.object({
    mode: v.literal("hours"),
    days: v.array(
      v.object({
        day: dayOfWeekValidator,
        enabled: v.boolean(),
        hours: v.number(),
      })
    ),
  }),
);

export default defineSchema({
  volunteers: defineTable({
    volunteerAccountId: v.optional(v.id("volunteerAccounts")),
    clerkUserId: v.optional(v.string()),
    name: v.string(),
    age: v.number(),
    location: v.string(),
    skills: v.array(v.string()),
    contactDetails: v.object({
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    availability: availabilityValidator,
    languagesSpoken: v.array(v.string()),
    hasTransport: v.boolean(),
    devices: v.array(deviceValidator),
    isVerified: v.optional(v.boolean()),
    reliabilityScore: v.optional(v.number()),
    tasksTaken: v.optional(v.number()),
    averageRating: v.optional(v.number()),
    averageResponseTimeHours: v.optional(v.number()),
  })
    .index("by_location", ["location"])
    .index("by_reliabilityScore", ["reliabilityScore"])
    .index("by_contactDetails_email", ["contactDetails.email"])
    .index("by_volunteerAccountId", ["volunteerAccountId"])
    .index("by_clerkUserId", ["clerkUserId"]),

  volunteerAccounts: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    volunteerId: v.optional(v.id("volunteers")),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_volunteerId", ["volunteerId"]),

  ngos: defineTable({
    ngoName: v.string(),
    registrationId: v.string(),
    hqLocation: v.string(),
    coverageArea: v.array(v.string()),
    focusAreas: v.array(v.string()),
    pocDetails: v.optional(
      v.object({
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
      }),
    ),
    isVerified: v.optional(v.boolean()),
    reliabilityScore: v.optional(v.number()),
    volunteerTreatmentScore: v.optional(v.number()),
    averageRating: v.optional(v.number()),
  })
    .index("by_registrationId", ["registrationId"])
    .index("by_pocDetails_email", ["pocDetails.email"])
    .index("by_coverageArea", ["coverageArea"])
    .index("by_isVerified", ["isVerified"]),

  jobListings: defineTable({
    ngoId: v.id("ngos"),
    title: v.string(),
    location: v.string(),
    startDateTime: v.number(),
    durationHours: v.number(),
    taskType: v.string(),
    urgency: urgencyValidator,
    requiredSkills: v.array(v.string()),
    skillPriorityMatrix: v.array(
      v.object({
        skill: v.string(),
        priority: v.number(),
      }),
    ),
    volunteersRequired: v.number(),
    volunteersAllocated: v.optional(v.number()),
    status: listingStatusValidator,
    description: v.optional(v.string()),
  })
    .index("by_ngoId", ["ngoId"])
    .index("by_urgency", ["urgency"])
    .index("by_status", ["status"])
    .index("by_location", ["location"])
    .index("by_status_and_urgency", ["status", "urgency"]),
});
