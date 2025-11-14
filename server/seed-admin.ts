import { db } from "./db";
import { admins } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.select().from(admins).where(eq(admins.username, "admin")).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash("admin", 10);

    // Create admin account
    await db.insert(admins).values({
      username: "admin",
      passwordHash,
    });

    console.log("✅ Admin user created successfully (username: admin, password: admin)");
  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error;
  }
}

seedAdmin()
  .then(() => {
    console.log("Admin seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exit(1);
  });
