import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { sendVerificationEmail } from "./email";

// Extend Express session type
declare module "express-session" {
  interface SessionData {
    userId?: string;
    adminId?: string;
  }
}

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  const isProduction = process.env.NODE_ENV === "production";
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only use secure cookies in production (HTTPS)
      maxAge: sessionTtl,
    },
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserById(userId);

    if (!user) {
      delete req.session.userId;
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: "Email not verified. Please check your email for verification link.",
        emailNotVerified: true
      });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

// Middleware to check if user is admin
export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for admin session
    const adminId = req.session.adminId;
    if (adminId) {
      const admin = await storage.getAdminById(adminId);
      if (admin) {
        return next();
      }
    }

    // Check for regular user with admin role
    if (req.session.userId) {
      const user = await storage.getUserById(req.session.userId);
      if (user && user.isAdmin) {
        return next();
      }
    }

    return res.status(403).json({ message: "Admin access required" });
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Authorization check failed" });
  }
};

// Setup authentication routes
export function setupAuthRoutes(app: Express) {
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: "Username, email, and password are required" 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ 
          message: "Password must be at least 6 characters long" 
        });
      }

      // Check if username or email already exists
      const existingUser = await storage.getUserByUsernameOrEmail(username, email);
      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(400).json({ message: "Username already exists" });
        }
        if (existingUser.email === email) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create user
      const user = await storage.createUser({
        username,
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerified: false,
        verificationToken,
        isAdmin: false,
      });

      // Send verification email
      try {
        await sendVerificationEmail(email, username, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail registration if email fails
      }

      res.json({
        message: "Registration successful. Please check your email to verify your account.",
        userId: user.id,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Verify email
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h1 style="color: #DC2626;">Invalid Verification Link</h1>
                <p>The verification link is invalid.</p>
                <a href="/login" style="color: #4F46E5; text-decoration: none;">Go to Login</a>
              </div>
            </body>
          </html>
        `);
      }

      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h1 style="color: #DC2626;">Invalid or Expired Token</h1>
                <p>The verification link is invalid or has expired.</p>
                <a href="/login" style="color: #4F46E5; text-decoration: none;">Go to Login</a>
              </div>
            </body>
          </html>
        `);
      }

      if (user.emailVerified) {
        return res.send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h1 style="color: #059669;">Email Already Verified</h1>
                <p>Your email has already been verified.</p>
                <a href="/login" style="color: #4F46E5; text-decoration: none;">Go to Login</a>
              </div>
            </body>
          </html>
        `);
      }

      // Verify email
      await storage.verifyUserEmail(user.id);

      res.send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1 style="color: #059669;">Email Verified Successfully!</h1>
              <p>Your email has been verified. You can now log in.</p>
              <a href="/login" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Go to Login</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1 style="color: #DC2626;">Verification Failed</h1>
              <p>An error occurred during verification. Please try again.</p>
              <a href="/login" style="color: #4F46E5; text-decoration: none;">Go to Login</a>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;

      if (!usernameOrEmail || !password) {
        return res.status(400).json({ 
          message: "Username/email and password are required" 
        });
      }

      const user = await storage.getUserByUsernameOrEmail(usernameOrEmail, usernameOrEmail);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email before logging in. Check your inbox for the verification link.",
          emailNotVerified: true
        });
      }

      // Create session
      req.session.userId = user.id;

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByUsernameOrEmail("", email);

      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If the email exists, a verification link has been sent." });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUserVerificationToken(user.id, verificationToken);

      // Send verification email
      try {
        await sendVerificationEmail(user.email, user.username, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        return res.status(500).json({ message: "Failed to send verification email" });
      }

      res.json({ message: "If the email exists, a verification link has been sent." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });
}
