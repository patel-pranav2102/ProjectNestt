import nodemailer from 'nodemailer';

// Create SMTP Transporter
const createTransporter = () => {
  const isPlaceholder = 
    process.env.EMAIL_USER === 'placeholder' || 
    !process.env.EMAIL_USER ||
    process.env.EMAIL_PASS === 'placeholder' ||
    !process.env.EMAIL_PASS;

  if (isPlaceholder) {
    console.log('⚠️ [Mailer] SMTP credentials are placeholders. Falling back to console-logging emails.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send an email helper with fallback logger
const sendMail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('\n=================== MOCK EMAIL SENT ===================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text}`);
    console.log('=======================================================\n');
    return { mock: true, messageId: 'mock-id-12345' };
  }

  const mailOptions = {
    from: `"ProjectNest Support" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  return await transporter.sendMail(mailOptions);
};

// Send Email Verification Link
export const sendVerificationEmail = async (email, name, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verificationUrl = `${clientUrl}/verify-email/${token}`;
  
  const subject = 'Verify your email - ProjectNest';
  const text = `Hi ${name},\n\nPlease verify your ProjectNest account by opening this link: ${verificationUrl}\n\nThank you,\nProjectNest Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #8b5cf6;">Welcome to ProjectNest!</h2>
      <p>Hi ${name},</p>
      <p>Thank you for signing up. Please verify your email address to activate your account and start collaborating.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">This link will expire in 24 hours. If you did not sign up for ProjectNest, please ignore this email.</p>
    </div>
  `;

  return await sendMail({ to: email, subject, html, text });
};

// Send Password Reset Link
export const sendPasswordResetEmail = async (email, name, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${token}`;

  const subject = 'Reset your password - ProjectNest';
  const text = `Hi ${name},\n\nYou requested a password reset. Please open the link to set a new password: ${resetUrl}\n\nIf you did not request this, ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #8b5cf6;">Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to update your login credentials.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">This link will expire in 1 hour. If you did not make this request, you can safely ignore this email.</p>
    </div>
  `;

  return await sendMail({ to: email, subject, html, text });
};
