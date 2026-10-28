import { db } from './index.ts';
import { users, userPreferences } from './schema.ts';
import { eq } from 'drizzle-orm';

const DEFAULT_ADMIN_EMAILS = new Set([
  'simonrilley56@gmail.com',
  ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.toLowerCase().trim()] : []),
]);

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const isDefaultAdmin = DEFAULT_ADMIN_EMAILS.has(normalizedEmail);

    const existing = await db.select().from(users).where(eq(users.uid, uid));
    const roleToAssign =
      existing.length > 0
        ? isDefaultAdmin
          ? 'admin'
          : existing[0].role
        : isDefaultAdmin
          ? 'admin'
          : 'reader';

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0],
        role: roleToAssign,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          displayName: displayName || normalizedEmail.split('@')[0],
          role: roleToAssign,
        },
      })
      .returning();

    // Ensure userPreferences row exists
    await db
      .insert(userPreferences)
      .values({
        userUid: uid,
      })
      .onConflictDoNothing({
        target: userPreferences.userUid,
      });

    return result[0];
  } catch (error) {
    console.error('Database user synchronization failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database getUserByUid failed:', error);
    throw new Error('Failed to retrieve user profile.', { cause: error });
  }
}

export async function listAllUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database listAllUsers failed:', error);
    throw new Error('Failed to list users.', { cause: error });
  }
}

export async function updateUserRole(uid: string, role: 'reader' | 'editor' | 'admin') {
  try {
    const updated = await db
      .update(users)
      .set({ role })
      .where(eq(users.uid, uid))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Database updateUserRole failed:', error);
    throw new Error('Failed to update user role.', { cause: error });
  }
}
