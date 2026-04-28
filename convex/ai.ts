"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";

type OpportunityDraftResult = {
  title: string;
  description: string;
  urgency: "Low" | "Medium" | "High";
  requiredSkills: string[];
  taskType: string;
};

type VolunteerMatchResult = {
  volunteerId: string;
  name: string;
  matchReason: string;
  score: number;
};

type VolunteerMatchesResponse = {
  matches: VolunteerMatchResult[];
};

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = gemini.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isUrgencyLabel = (value: unknown): value is OpportunityDraftResult["urgency"] =>
  value === "Low" || value === "Medium" || value === "High";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isOpportunityDraftResult = (value: unknown): value is OpportunityDraftResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    isUrgencyLabel(value.urgency) &&
    isStringArray(value.requiredSkills) &&
    typeof value.taskType === "string"
  );
};

const isVolunteerMatchResult = (value: unknown): value is VolunteerMatchResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.volunteerId === "string" &&
    typeof value.name === "string" &&
    typeof value.matchReason === "string" &&
    isFiniteNumber(value.score)
  );
};

const isVolunteerMatchesResponse = (value: unknown): value is VolunteerMatchesResponse => {
  if (!isRecord(value) || !Array.isArray(value.matches)) {
    return false;
  }

  return value.matches.every((match) => isVolunteerMatchResult(match));
};

const parseStrictJson = <T>(
  rawJson: string,
  guard: (value: unknown) => value is T,
  responseLabel: string,
): T => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(
      `Gemini returned invalid JSON for ${responseLabel}: ${error instanceof Error ? error.message : "Unknown parse error."}`,
    );
  }

  if (!guard(parsed)) {
    throw new Error(`Gemini JSON did not match the required ${responseLabel} schema.`);
  }

  return parsed;
};

export const draftOpportunity = action({
  args: {
    inputNotes: v.string(),
  },
  handler: async (_ctx, args) => {
    const inputNotes = args.inputNotes.trim();
    if (inputNotes.length === 0) {
      throw new Error("inputNotes must not be empty.");
    }

    const prompt = [
      "You are an NGO coordinator writing volunteer opportunities.",
      "Convert the rough notes into a professional volunteer listing.",
      "Respond with JSON only and no markdown.",
      "Use this exact schema:",
      `{"title":"string","description":"string","urgency":"Low|Medium|High","requiredSkills":["string"],"taskType":"string"}`,
      "Guidelines:",
      "- Keep title concise and action-oriented.",
      "- Description should be clear, realistic, and volunteer-friendly.",
      "- requiredSkills should contain 3 to 8 practical skills.",
      "- urgency must be exactly one of Low, Medium, High.",
      `Input notes: """${inputNotes}"""`,
    ].join("\n");

    const response = await model.generateContent(prompt);
    return parseStrictJson(
      response.response.text(),
      isOpportunityDraftResult,
      "draftOpportunity response",
    );
  },
});

export const matchVolunteersToOpportunity = action({
  args: {
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const opportunity: Doc<"opportunities"> | null = await ctx.runQuery(
      api.queries.getOpportunityById,
      { opportunityId: args.opportunityId },
    );
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    const volunteers: Doc<"volunteers">[] = await ctx.runQuery(
      api.queries.getAvailableVolunteersForMatching,
      {},
    );
    if (volunteers.length === 0) {
      return { matches: [] };
    }

    const volunteerProfiles = volunteers.map((volunteer) => ({
      volunteerId: volunteer._id,
      name: volunteer.name,
      location: volunteer.location,
      skills: volunteer.skills,
      languagesSpoken: volunteer.languagesSpoken,
      hasTransport: volunteer.hasTransport,
      devices: volunteer.devices,
      reliabilityScore: volunteer.reliabilityScore ?? null,
      averageRating: volunteer.averageRating ?? null,
      averageResponseTimeHours: volunteer.averageResponseTimeHours ?? null,
      availability: volunteer.availability,
    }));

    const prompt = [
      "You are an HR matching engine for volunteer staffing.",
      "Given one opportunity and a list of volunteer profiles, return the top 3 matches.",
      "Respond with JSON only and no markdown.",
      "Use this exact schema:",
      `{"matches":[{"volunteerId":"string","name":"string","matchReason":"string","score":number}]}`,
      "Rules:",
      "- score must be a number from 0 to 100.",
      "- Sort matches by score descending.",
      "- matchReason must be specific to the opportunity requirements.",
      "- Use only volunteerId values from the provided profiles.",
      `Opportunity: ${JSON.stringify(opportunity)}`,
      `Volunteer profiles: ${JSON.stringify(volunteerProfiles)}`,
    ].join("\n");

    const response = await model.generateContent(prompt);
    const parsed = parseStrictJson(
      response.response.text(),
      isVolunteerMatchesResponse,
      "matchVolunteersToOpportunity response",
    );

    const validVolunteerIds = new Set(volunteers.map((volunteer) => String(volunteer._id)));
    const deduplicatedMatches: VolunteerMatchResult[] = [];

    for (const match of parsed.matches) {
      if (!validVolunteerIds.has(match.volunteerId)) {
        continue;
      }
      if (deduplicatedMatches.some((item) => item.volunteerId === match.volunteerId)) {
        continue;
      }

      deduplicatedMatches.push({
        ...match,
        score: Math.max(0, Math.min(100, match.score)),
      });

      if (deduplicatedMatches.length === 3) {
        break;
      }
    }

    return { matches: deduplicatedMatches };
  },
});
