import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { availabilityValidator } from "./schema";

const deviceValidator = v.union(
  v.literal("camera"),
  v.literal("pc"),
  v.literal("smartphone"),
);

const volunteerFields = {
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
};

export const createVolunteer = mutation({
  args: volunteerFields,
  handler: async (ctx, args) => {
    const existingVolunteer = await ctx.db
      .query("volunteers")
      .withIndex("by_contactDetails_email", (q) =>
        q.eq("contactDetails.email", args.contactDetails.email),
      )
      .unique();

    if (existingVolunteer) {
      throw new Error("A volunteer with this email already exists.");
    }

    return await ctx.db.insert("volunteers", args);
  },
});

export const getVolunteerById = query({
  args: {
    volunteerId: v.id("volunteers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get("volunteers", args.volunteerId);
  },
});

export const listVolunteersByLocation = query({
  args: {
    location: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("volunteers")
      .withIndex("by_location", (q) => q.eq("location", args.location))
      .take(100);
  },
});

export const getVolunteerByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("volunteers")
      .withIndex("by_contactDetails_email", (q) =>
        q.eq("contactDetails.email", args.email),
      )
      .unique();
  },
});

export const updateVolunteer = mutation({
  args: {
    volunteerId: v.id("volunteers"),
    ...volunteerFields,
  },
  handler: async (ctx, args) => {
    const { volunteerId, ...updates } = args;
    const existingVolunteer = await ctx.db
      .query("volunteers")
      .withIndex("by_contactDetails_email", (q) =>
        q.eq("contactDetails.email", updates.contactDetails.email),
      )
      .unique();

    if (existingVolunteer && existingVolunteer._id !== volunteerId) {
      throw new Error("A volunteer with this email already exists.");
    }

    await ctx.db.patch("volunteers", volunteerId, updates);
    return await ctx.db.get("volunteers", volunteerId);
  },
});
