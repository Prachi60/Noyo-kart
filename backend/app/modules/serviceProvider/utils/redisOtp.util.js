import crypto from 'crypto';
import { getRedis, isRedisConnected } from '../services/redisService.js';
import SpToken from '../models/SpToken.js';

// Constants
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS) || 300;
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
const RATE_LIMIT_COUNT = parseInt(process.env.OTP_RATE_LIMIT) || 3;
const RATE_LIMIT_WINDOW = parseInt(process.env.OTP_RATE_WINDOW) || 600;
const DEFAULT_OTP = '123456';

/**
 * Default OTP is on when USE_DEFAULT_OTP=true, or when not in production.
 * NODE_ENV unset counts as development.
 */
export const isDefaultOtpEnabled = () => {
  const flag = String(process.env.USE_DEFAULT_OTP || '').trim().toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;
  const env = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
  return env !== 'production';
};

export const normalizeOtp = (otp) => String(otp ?? '').replace(/\D/g, '');

/**
 * Generate 6-digit OTP
 */
export const generateOTP = () => {
  if (isDefaultOtpEnabled()) {
    return DEFAULT_OTP;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP using SHA-256
 */
export const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

/**
 * Check rate limit for phone number
 * Returns true if allowed, false if limit exceeded
 */
export const checkRateLimit = async (phone) => {
  const redis = getRedis();
  if (!isRedisConnected() || !redis) {
    console.warn('[OTP] Redis down, skipping rate limit check (fail-open)');
    return true;
  }

  const key = `rate:otp:${phone}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    return current <= RATE_LIMIT_COUNT;
  } catch (err) {
    console.error('[OTP] Rate limit error:', err);
    return true; // Fail open
  }
};

/**
 * Store OTP (Redis + MongoDB mirror)
 */
export const storeOTP = async (phone, otpHash) => {
  const redis = getRedis();
  let redisOk = false;

  if (isRedisConnected() && redis) {
    try {
      const key = `otp:${phone}`;
      const data = JSON.stringify({ hash: otpHash, attempts: 0 });
      await redis.set(key, data, 'EX', OTP_EXPIRY);
      console.log(`[OTP] Stored in Redis for ${phone}`);
      redisOk = true;
    } catch (err) {
      console.error('[OTP] Redis store failed, falling back to MongoDB:', err);
    }
  }

  try {
    await SpToken.deleteMany({ phone, type: 'PHONE_VERIFICATION' });

    await SpToken.create({
      phone,
      type: 'PHONE_VERIFICATION',
      token: otpHash,
      otp: otpHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY * 1000),
      attempts: 0
    });
    console.log(`[OTP] Stored in MongoDB${redisOk ? ' (mirror)' : ' (fallback)'} for ${phone}`);
    return true;
  } catch (err) {
    console.error('[OTP] MongoDB store failed:', err);
    if (redisOk) return true;
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Verify OTP (Redis Primary -> MongoDB Fallback)
 * Returns: { success: true/false, message: string }
 */
export const verifyOTP = async (phone, plainOtp) => {
  const otp = normalizeOtp(plainOtp);
  console.log(`[OTP] Verifying OTP for phone: ${phone}, OTP: ${otp}, defaultEnabled=${isDefaultOtpEnabled()}`);

  // Dev / default OTP bypass — works even if Redis/Mongo entry was lost
  if (isDefaultOtpEnabled() && otp === DEFAULT_OTP) {
    console.log(`[OTP] ✅ Default OTP accepted for ${phone}`);
    // Clear any stale Redis/Mongo entries so next login is clean
    try {
      const redis = getRedis();
      if (isRedisConnected() && redis) await redis.del(`otp:${phone}`);
      await SpToken.deleteMany({ phone, type: 'PHONE_VERIFICATION' });
    } catch (_) {
      /* ignore cleanup errors */
    }
    return { success: true };
  }

  const redis = getRedis();
  const inputHash = hashOTP(otp);
  console.log(`[OTP] Input OTP hash: ${inputHash.substring(0, 10)}...`);

  // 1. Try Redis
  if (isRedisConnected() && redis) {
    try {
      const key = `otp:${phone}`;
      const data = await redis.get(key);

      if (data) {
        console.log(`[OTP] Found in Redis for ${phone}`);
        const otpData = JSON.parse(data);

        if (otpData.attempts >= MAX_ATTEMPTS) {
          await redis.del(key);
          console.log(`[OTP] Max attempts exceeded for ${phone}`);
          return { success: false, message: 'Too many attempts. Please request new OTP.' };
        }

        if (otpData.hash !== inputHash) {
          otpData.attempts += 1;
          const ttl = await redis.ttl(key);
          if (ttl > 0) {
            await redis.set(key, JSON.stringify(otpData), 'EX', ttl);
          }
          console.log(`[OTP] Invalid OTP for ${phone}, attempts: ${otpData.attempts}`);
          return { success: false, message: 'Invalid OTP' };
        }

        await redis.del(key);
        console.log(`[OTP] ✅ Verification successful for ${phone}`);
        return { success: true };
      }

      console.log(`[OTP] Not found in Redis for ${phone}, checking MongoDB...`);
    } catch (err) {
      console.error('[OTP] Redis verify failed, trying MongoDB:', err);
    }
  }

  // 2. Check MongoDB (Fallback)
  try {
    const tokenDoc = await SpToken.findOne({
      phone,
      type: 'PHONE_VERIFICATION',
      isUsed: false
    });

    if (!tokenDoc) {
      console.log(`[OTP] ❌ Not found in MongoDB for ${phone}`);
      return { success: false, message: 'Invalid or expired OTP. Please request a new one.' };
    }

    console.log(`[OTP] Found in MongoDB for ${phone}`);

    if (tokenDoc.expiresAt < new Date()) {
      await SpToken.deleteOne({ _id: tokenDoc._id });
      console.log(`[OTP] Expired in MongoDB for ${phone}`);
      return { success: false, message: 'OTP expired. Please request a new one.' };
    }

    if (tokenDoc.attempts >= MAX_ATTEMPTS) {
      await SpToken.deleteOne({ _id: tokenDoc._id });
      console.log(`[OTP] Max attempts exceeded in MongoDB for ${phone}`);
      return { success: false, message: 'Too many attempts. Please request a new one.' };
    }

    let isMatch = false;
    if (tokenDoc.otp?.length === 64) {
      isMatch = tokenDoc.otp === inputHash;
    } else {
      isMatch = tokenDoc.otp === otp;
    }

    if (!isMatch) {
      tokenDoc.attempts += 1;
      await tokenDoc.save();
      console.log(`[OTP] Invalid OTP in MongoDB for ${phone}, attempts: ${tokenDoc.attempts}`);
      return { success: false, message: 'Invalid OTP' };
    }

    await SpToken.deleteOne({ _id: tokenDoc._id });
    console.log(`[OTP] ✅ Verification successful (MongoDB) for ${phone}`);
    return { success: true };
  } catch (err) {
    console.error('[OTP] MongoDB verify error:', err);
    return { success: false, message: 'Verification failed. Please try again.' };
  }
};
