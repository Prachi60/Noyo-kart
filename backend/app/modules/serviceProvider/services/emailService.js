import nodemailer from 'nodemailer';

const COLORS = {
  primary: '#00a6a6',
  secondary: '#115e59',
  accent: '#f59e0b',
  success: '#10b981',
  bg: '#f1f5f9',
  white: '#ffffff',
  text: '#0f172a',
  lightText: '#64748b',
  border: '#e2e8f0'
};

const emailWrapper = (content, title, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${COLORS.bg}; margin: 0; padding: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: ${COLORS.bg}; padding-bottom: 60px; }
    .main { max-width: 600px; margin: 0 auto; background-color: ${COLORS.white}; border-radius: 24px; overflow: hidden; margin-top: 40px; }
    .header { background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%); padding: 48px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: ${COLORS.white}; font-weight: 800; }
    .content { padding: 48px 40px; color: ${COLORS.text}; }
    .footer { text-align: center; padding: 40px; }
    .footer p { font-size: 13px; color: ${COLORS.lightText}; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="header">
        <h1>Homster</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Homster India. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send OTP Email
 */
export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[EMAIL SERVICE] OTP for ${email}: ${otp}`);
      return { success: true };
    }

    const transporter = createTransporter();
    const subjectPrefix = purpose === 'password_reset' ? 'Reset Password' : 'Verify Email';

    const content = `
      <div style="text-align: center;">
        <h2>Verify your identity</h2>
        <p>Your one-time password (OTP) for Homster is ready.</p>
        <div style="background: ${COLORS.bg}; border-radius: 20px; padding: 40px; margin: 40px 0; border: 2px dashed ${COLORS.primary};">
          <div style="font-size: 48px; font-weight: 900; letter-spacing: 12px; color: ${COLORS.primary};">${otp}</div>
          <div style="font-size: 13px; color: ${COLORS.lightText};">Valid for 10 minutes only</div>
        </div>
        <p style="font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Homster <noreply@homster.com>',
      to: email,
      subject: `${subjectPrefix} - Homster`,
      html: emailWrapper(content, subjectPrefix, `Your verification code is ${otp}`)
    });
    return { success: true };
  } catch (error) {
    console.error('OTP email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Welcome Email
 */
export const sendWelcomeEmail = async (email, name) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return { success: true };
    const transporter = createTransporter();

    const content = `
      <div style="text-align: center;">
        <h2>Hello ${name}! 👋</h2>
        <p>Welcome to the Homster family. We're excited to help you take care of your home with our premium services.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Homster <noreply@homster.com>',
      to: email,
      subject: 'Welcome to Homster!',
      html: emailWrapper(content, 'Welcome', 'Welcome to the future of home services')
    });
    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Booking Email
 */
export const sendBookingEmails = async (booking, user, vendor, service) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const transporter = createTransporter();
    const bookingId = booking.bookingNumber || booking._id;

    if (user && user.email) {
      const content = `
        <h2>Booking Scheduled</h2>
        <p>Your booking for <strong>${service.title || service.name}</strong> has been confirmed.</p>
        <p>Booking ID: #${bookingId}</p>
        <p>Date: ${new Date(booking.scheduledDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
        <p>Time: ${booking.scheduledTime}</p>
        <p>Total: ₹${booking.finalAmount}</p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Homster <noreply@homster.com>',
        to: user.email,
        subject: `Booking Confirmed #${bookingId} - Homster`,
        html: emailWrapper(content, 'Confirmed')
      });
    }

    if (vendor && vendor.email) {
      const vContent = `
        <h2>Incoming Order</h2>
        <p>Hello ${vendor.name}, a new booking has been assigned to you.</p>
        <p>Order: #${bookingId}</p>
        <p>Service: ${service.title}</p>
        <p>Customer: ${user.name}</p>
        <p>Amount: ₹${booking.finalAmount}</p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Homster <noreply@homster.com>',
        to: vendor.email,
        subject: `New Job Assigned #${bookingId} - Homster`,
        html: emailWrapper(vContent, 'New Job')
      });
    }
  } catch (error) { console.error('Booking email error:', error); }
};

/**
 * Send Booking Completion / Invoice Email
 */
export const sendBookingCompletionEmails = async (booking) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const transporter = createTransporter();
    const user = booking.userId;
    const bookingId = booking.bookingNumber || booking._id;

    if (user && user.email) {
      const content = `
        <h2>Service Completed</h2>
        <p>Thank you for choosing Homster. Invoice #INV-${bookingId}</p>
        <p>Amount Paid: ₹${booking.finalAmount}</p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Homster <noreply@homster.com>',
        to: user.email,
        subject: `Service Invoice #${bookingId} - Homster`,
        html: emailWrapper(content, 'Invoice')
      });
    }
  } catch (error) { console.error('Invoice email error:', error); }
};

/**
 * Send Withdrawal Approved Email
 */
export const sendWithdrawalApprovedEmail = async (vendor, amount, transactionId) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !vendor.email) return;
    const transporter = createTransporter();

    const content = `
      <h2>Funds Withdrawn Successfully</h2>
      <p>Hi ${vendor.name}, your withdrawal of ₹${amount} has been processed.</p>
      <p>Transaction Ref: ${transactionId || 'N/A'}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Homster <noreply@homster.com>',
      to: vendor.email,
      subject: 'Withdrawal Success - Homster',
      html: emailWrapper(content, 'Withdrawal')
    });
  } catch (error) { console.error(error); }
};

/**
 * Send Dues Payment Approved Email
 */
export const sendDuesPaymentApprovedEmail = async (vendor, amount, balanceAfter) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !vendor.email) return;
    const transporter = createTransporter();

    const content = `
      <h2>Payment Acknowledged</h2>
      <p>Hi ${vendor.name}, we've verified your dues payment of ₹${amount}.</p>
      <p>Remaining Balance: ₹${balanceAfter}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Homster <noreply@homster.com>',
      to: vendor.email,
      subject: 'Dues Payment Verified - Homster',
      html: emailWrapper(content, 'Verified')
    });
  } catch (error) { console.error(error); }
};
