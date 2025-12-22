import db from "../server/db.js";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const result = await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, "trader1@test.com"));

    console.log("✅ Updated trader1 emailVerified to true");

    // Also create trader2 while we're at it
    const bcrypt = await import("bcryptjs");
    const trader2 = await db.insert(users).values({
      email: "trader2@test.com",
      name: "Trader Two",
      password: await bcrypt.hash("Test123!Test", 10),
      role: "user",
      emailVerified: true,
      loginMethod: "email",
    });

    console.log("✅ Created trader2 account (already verified)");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
