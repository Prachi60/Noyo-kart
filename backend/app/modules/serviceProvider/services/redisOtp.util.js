import crypto from 'crypto';

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  if (process.env.USE_DEFAULT_OTP === 'true') {
    return '123456';
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP using SHA-256
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// In-memory OTP store (fallback when Redis is not available)
const otpStore = new Map();
const rateLimitStore = new Map();

/**
 * Store OTP (in-memory fallback)
 */
const storeOTP = async (phone, otpHash) => {
  otpStore.set(phone, { hash: otpHash, createdAt: Date.now(), attempts: 0 });
  // Auto-expire after 10 minutes
  setTimeout(() => otpStore.delete(phone), 10 * 60 * 1000);
};

/**
 * Verify OTP
 */
const verifyOTP = async (phone, otp) => {
  // Default OTP bypass for development
  if (process.env.USE_DEFAULT_OTP === 'true' && otp === '123456') {
    return { success: true };
  }

  const stored = otpStore.get(phone);
  if (!stored) {
    return { success: false, message: 'OTP expired or not found. Please request a new one.' };
  }

  // Check attempts
  if (stored.attempts >= 5) {
    otpStore.delete(phone);
    return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  // Check expiry (10 minutes)
  if (Date.now() - stored.createdAt > 10 * 60 * 1000) {
    otpStore.delete(phone);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  const otpHash = hashOTP(otp);
  if (otpHash !== stored.hash) {
    stored.attempts += 1;
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP verified - remove it
  otpStore.delete(phone);
  return { success: true };
};

/**
 * Check rate limit (max 5 OTP requests per 10 minutes)
 */
const checkRateLimit = async (phone) => {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;

  const record = rateLimitStore.get(phone);
  if (!record) {
    rateLimitStore.set(phone, { count: 1, firstRequest: now });
    return true;
  }

  if (now - record.firstRequest > windowMs) {
    rateLimitStore.set(phone, { count: 1, firstRequest: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
};

export { generateOTP, hashOTP, storeOTP, verifyOTP, checkRateLimit };
