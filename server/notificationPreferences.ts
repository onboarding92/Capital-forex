/**
 * Notification Preferences Module
 * 
 * Manages user notification preferences for different notification types
 */

import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface NotificationPreferences {
  trade: boolean;
  deposit: boolean;
  withdrawal: boolean;
  security: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  trade: true,
  deposit: true,
  withdrawal: true,
  security: true,
};

/**
 * Get user notification preferences
 */
export async function getUserPreferences(userId: number): Promise<NotificationPreferences> {
  const db = await getDb();
  if (!db) {
    console.error("[NotificationPreferences] Database not available");
    return DEFAULT_PREFERENCES;
  }

  const result = await db.select({ notificationPreferences: users.notificationPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0 || !result[0].notificationPreferences) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const preferences = JSON.parse(result[0].notificationPreferences);
    return {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    };
  } catch (error) {
    console.error("[NotificationPreferences] Failed to parse preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(
  userId: number,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get current preferences
  const currentPreferences = await getUserPreferences(userId);

  // Merge with new preferences
  const updatedPreferences: NotificationPreferences = {
    ...currentPreferences,
    ...preferences,
  };

  // Save to database
  await db.update(users)
    .set({ notificationPreferences: JSON.stringify(updatedPreferences) })
    .where(eq(users.id, userId));

  console.log(`[NotificationPreferences] Updated preferences for user ${userId}:`, updatedPreferences);

  return updatedPreferences;
}

/**
 * Check if user has enabled a specific notification type
 */
export async function isNotificationEnabled(
  userId: number,
  notificationType: keyof NotificationPreferences
): Promise<boolean> {
  const preferences = await getUserPreferences(userId);
  return preferences[notificationType] ?? true; // Default to enabled if not set
}
