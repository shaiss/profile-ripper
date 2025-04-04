
import { z } from "zod";

/**
 * Schema for AI Follower import/export
 * Based on the database schema but optimized for external transfer
 */
export const AIFollowerProfileSchema = z.object({
  // Schema version for forward compatibility
  schemaVersion: z.string().default("1.0"),
  
  // Basic information
  name: z.string(),
  personality: z.string(),
  avatarUrl: z.string(),
  
  // Detailed profile information (optional fields)
  background: z.string().optional(),
  interests: z.array(z.string()).optional().default([]),
  communicationStyle: z.string().optional(),
  
  // Interaction preferences
  interactionPreferences: z.object({
    likes: z.array(z.string()).optional().default([]),
    dislikes: z.array(z.string()).optional().default([]),
  }).optional().default({ likes: [], dislikes: [] }),
  
  // Behavior settings
  active: z.boolean().default(true),
  responsiveness: z.enum(["instant", "active", "casual", "zen"]).default("active"),
  responseDelay: z.object({
    min: z.number(),
    max: z.number(),
  }).default({ min: 1, max: 1440 }),
  responseChance: z.number().int().min(0).max(100).default(80),
  
  // Tools configuration
  tools: z.object({
    equipped: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      enabled: z.boolean().default(false),
    })).default([]),
    customInstructions: z.string().optional().default(""),
  }).optional().default({ equipped: [], customInstructions: "" }),
  
  // Metadata (not used for import, but useful for export)
  metadata: z.object({
    exportedAt: z.string().datetime().optional(),
    exportedBy: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

// Type definition from the schema
export type AIFollowerProfile = z.infer<typeof AIFollowerProfileSchema>;

/**
 * Example usage:
 * 
 * // Validate profile data
 * const result = AIFollowerProfileSchema.safeParse(jsonData);
 * if (result.success) {
 *   // Use validated data
 *   const profile = result.data;
 * } else {
 *   // Handle validation errors
 *   console.error(result.error);
 * }
 */
