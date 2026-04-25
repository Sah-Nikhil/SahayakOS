import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncCurrentVolunteerAccount = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const resolvedEmail = args.email?.trim().toLowerCase() ?? identity.email;

    if (!resolvedEmail) {
      throw new Error("Clerk account is missing an email address.");
    }

    const existingAccount = await ctx.db
      .query("volunteerAccounts")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const resolvedName = args.name ?? identity.name;
    const account = {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      email: resolvedEmail,
      ...(resolvedName ? { name: resolvedName } : {}),
      ...(args.phone ? { phone: args.phone } : {}),
    };

    if (existingAccount) {
      await ctx.db.patch(existingAccount._id, account);
      return existingAccount._id;
    }

    return await ctx.db.insert("volunteerAccounts", account);
  },
});

export const getCurrentVolunteerAccount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("volunteerAccounts")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const getCurrentVolunteerContext = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const account = await ctx.db
      .query("volunteerAccounts")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!account) {
      return null;
    }

    const linkedVolunteer =
      (account.volunteerId ? await ctx.db.get(account.volunteerId) : null) ??
      (await ctx.db
        .query("volunteers")
        .withIndex("by_volunteerAccountId", (q) => q.eq("volunteerAccountId", account._id))
        .unique()) ??
      (await ctx.db
        .query("volunteers")
        .withIndex("by_contactDetails_email", (q) => q.eq("contactDetails.email", account.email))
        .unique());

    return {
      account,
      volunteer: linkedVolunteer,
    };
  },
});
