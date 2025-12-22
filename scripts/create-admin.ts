/**
 * Create Admin User Script
 * 
 * Creates an admin user with email and password.
 * Usage: npx tsx scripts/create-admin.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

async function createAdmin() {
  console.log("🔧 Creating admin user...\n");

  // Admin credentials
  const adminEmail = "admin@bitchangemoney.xyz";
  const adminPassword = "Admin@BitChange2024!"; // Change this in production
  const adminName = "Admin";

  try {
    // Connect to database
    const connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);

    // Check if admin already exists
    const existing = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existing.length > 0) {
      console.log("⚠️  Admin user already exists!");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Role: ${existing[0].role}`);
      
      // Update to admin role if not already
      if (existing[0].role !== "admin") {
        await db.update(users)
          .set({ role: "admin" })
          .where(eq(users.id, existing[0].id));
        console.log("✅ Updated user role to admin");
      }
      
      await connection.end();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: "admin",
      emailVerified: new Date(), // Auto-verify admin
      kycStatus: "approved", // Auto-approve KYC for admin
    });

    console.log("✅ Admin user created successfully!\n");
    console.log("📧 Email:    " + adminEmail);
    console.log("🔑 Password: " + adminPassword);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    console.log("   Go to Settings → Security → Change Password\n");

    await connection.end();
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdmin();
