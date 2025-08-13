// server/emailService.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
// Note: In a production environment, you might load dotenv earlier in your application's lifecycle
// or use a different method for environment variable management.
dotenv.config();

const EMAIL_SERVICE_USER = process.env.EMAIL_SERVICE_USER;
const EMAIL_SERVICE_PASS = process.env.EMAIL_SERVICE_PASS;
const EMAIL_SERVICE_HOST = process.env.EMAIL_SERVICE_HOST;
const EMAIL_SERVICE_PORT = process.env.EMAIL_SERVICE_PORT ? parseInt(process.env.EMAIL_SERVICE_PORT) : undefined;

// Basic validation for environment variables
if (!EMAIL_SERVICE_USER || !EMAIL_SERVICE_PASS || !EMAIL_SERVICE_HOST || !EMAIL_SERVICE_PORT) {
  console.error('ERROR: Email service environment variables are not fully configured.');
  console.error('Please ensure EMAIL_SERVICE_USER, EMAIL_SERVICE_PASS, EMAIL_SERVICE_HOST, and EMAIL_SERVICE_PORT are set in your .env file.');
  // In a real application, you might want to throw an error here to prevent the server from starting
  // if email functionality is critical.
}

// Create a Nodemailer transporter using your SMTP configuration
const transporter = nodemailer.createTransport({
  host: EMAIL_SERVICE_HOST,
  port: EMAIL_SERVICE_PORT,
  secure: EMAIL_SERVICE_PORT === 465, // true for 465 (SSL/TLS), false for other ports (STARTTLS)
  auth: {
    user: EMAIL_SERVICE_USER,
    pass: EMAIL_SERVICE_PASS,
  },
  tls: {
    // WARNING: This should be set to true in production if you have a valid SSL certificate.
    // Setting to false bypasses certificate validation, which is insecure but can be useful for local development
    // or if you are using a self-signed certificate.
    rejectUnauthorized: false
  }
});

/**
 * Interface for options when sending an email.
 */
interface SendEmailOptions {
  to: string;        // Recipient email address
  subject: string;   // Email subject line
  html: string;      // HTML content of the email body
  from?: string;     // Optional: Sender email address, defaults to EMAIL_SERVICE_USER if not provided
}

/**
 * Sends an email using the configured Nodemailer transporter.
 * @param {SendEmailOptions} options - The email sending options.
 * @returns {Promise<{ success: boolean; messageId?: string; error?: string }>} A promise that resolves with success status and message ID, or rejects with an error.
 */
export const sendEmail = async ({ to, subject, html, from }: SendEmailOptions) => {
  try {
    const mailOptions = {
      from: from || EMAIL_SERVICE_USER, // Use provided 'from' address or default from .env
      to: to,
      subject: subject,
      html: html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: Message ID: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending email:', error);
    // Re-throw a more specific error for the route handler to catch
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
};
