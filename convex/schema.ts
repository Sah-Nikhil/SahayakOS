import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const deviceValidator = v.union(
  v.literal("camera"),
  v.literal("pc"),
  v.literal("smartphone"),
);

export const opportunityUrgencyValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

export const opportunityStatusValidator = v.union(
  v.literal("open"),
  v.literal("filled"),
  v.literal("closed"),
);

export const opportunityApplicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("denied"),
);

export const opportunityLocationTypeValidator = v.union(
  v.literal("hq"),
  v.literal("field"),
  v.literal("remote"),
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

export const opportunityDayOfWeekValidator = dayOfWeekValidator;

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

export const ngoHqLocationValidator = v.object({
  city: v.string(),
  state: v.optional(v.string()),
  country: v.string(),
  lat: v.number(),
  lng: v.number(),
});

export const opportunityLocationValidator = v.object({
  type: opportunityLocationTypeValidator,
  city: v.string(),
  lat: v.number(),
  lng: v.number(),
});

export const opportunityTimeWindowValidator = v.object({
  start: v.number(),
  end: v.number(),
  durationHours: v.number(),
});

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
    name: v.string(),
    registrationId: v.string(),
    description: v.optional(v.string()),
    hqLocation: ngoHqLocationValidator,
    coverageAreas: v.array(v.string()),
    focusAreas: v.array(v.string()),
    createdBy: v.optional(v.id("volunteers")),
    ownerTokenIdentifier: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_city", ["hqLocation.city"])
    .index("by_registrationId", ["registrationId"])
    .index("by_createdBy", ["createdBy"])
    .index("by_ownerTokenIdentifier", ["ownerTokenIdentifier"]),

  opportunities: defineTable({
    ngoId: v.id("ngos"),
    title: v.string(),
    description: v.string(),
    location: opportunityLocationValidator,
    timeWindow: opportunityTimeWindowValidator,
    days: v.optional(v.array(dayOfWeekValidator)),
    taskType: v.string(),
    urgency: opportunityUrgencyValidator,
    requiredSkills: v.array(v.string()),
    skillPriorityMatrix: v.array(
      v.object({
        skill: v.string(),
        priority: v.number(),
      }),
    ),
    volunteersRequired: v.number(),
    createdAt: v.number(),
    status: opportunityStatusValidator,
  })
    .index("by_ngo", ["ngoId"])
    .index("by_city", ["location.city"])
    .index("by_urgency", ["urgency"])
    .index("by_status", ["status"]),

  opportunityApplications: defineTable({
    opportunityId: v.id("opportunities"),
    ngoId: v.id("ngos"),
    volunteerId: v.id("volunteers"),
    volunteerAccountId: v.id("volunteerAccounts"),
    status: opportunityApplicationStatusValidator,
    appliedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedByTokenIdentifier: v.optional(v.string()),
  })
    .index("by_opportunity", ["opportunityId"])
    .index("by_ngo", ["ngoId"])
    .index("by_ngo_and_status", ["ngoId", "status"])
    .index("by_volunteer", ["volunteerId"])
    .index("by_volunteer_and_opportunity", ["volunteerId", "opportunityId"])
    .index("by_opportunity_and_status", ["opportunityId", "status"]),
});
