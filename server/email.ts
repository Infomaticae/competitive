import sgMail from "@sendgrid/mail";

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export async function sendVerificationEmail(
  email: string,
  username: string,
  verificationToken: string
) {
  if (!apiKey) {
    console.error("SENDGRID_API_KEY not configured");
    throw new Error("Email service not configured");
  }

  const verificationUrl = `${process.env.REPLIT_DEV_DOMAIN || "http://localhost:5000"}/api/auth/verify-email?token=${verificationToken}`;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || "noreply@yourapp.com", // Use your verified sender
    subject: "Verify your email - LMS Platform",
    text: `Hello ${username},\n\nPlease verify your email by clicking this link: ${verificationUrl}\n\nThis link will expire in 24 hours.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to LMS Platform!</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
        <p style="color: #666; font-size: 14px;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);
  } catch (error: any) {
    console.error("SendGrid error:", error.response?.body || error.message);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetToken: string
) {
  if (!apiKey) {
    console.error("SENDGRID_API_KEY not configured");
    throw new Error("Email service not configured");
  }

  const resetUrl = `${process.env.REPLIT_DEV_DOMAIN || "http://localhost:5000"}/reset-password?token=${resetToken}`;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || "noreply@yourapp.com",
    subject: "Password Reset - LMS Platform",
    text: `Hello ${username},\n\nClick this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
        <p style="color: #666; font-size: 14px;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${email}`);
  } catch (error: any) {
    console.error("SendGrid error:", error.response?.body || error.message);
    throw new Error("Failed to send password reset email");
  }
}
