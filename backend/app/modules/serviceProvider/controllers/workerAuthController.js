import SpWorker from '../models/SpWorker.js';
import { generateOTP, hashOTP, storeOTP, verifyOTP, checkRateLimit } from '../utils/redisOtp.util.js';
import { generateTokenPair, verifyRefreshToken, generateVerificationToken, verifyVerificationToken } from '../utils/tokenService.js';
import { sendOTP as sendSMSOTP } from '../services/smsService.js';
import * as cloudinaryService from '../services/cloudinaryService.js';
import { SP_USER_ROLES, SP_WORKER_STATUS } from '../constants.js';
import { validationResult } from 'express-validator';

/**
 * Send OTP for worker registration/login
 */
export const sendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, email } = req.body;

    const allowed = await checkRateLimit(phone);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after 10 minutes.'
      });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    await storeOTP(phone, otpHash);
    const smsResult = await sendSMSOTP(phone, otp);

    if (process.env.NODE_ENV === 'development' || process.env.USE_DEFAULT_OTP === 'true') {
      console.log(`[DEV] Worker OTP for ${phone}: ${otp}`);
    }

    if (!smsResult.success) {
      console.warn(`[OTP] SMS failed for worker ${phone}, but OTP stored`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      token: 'verification-pending'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

/**
 * Verify OTP and Check Worker Status (Unified Login/Signup Entry)
 */
export const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    const worker = await SpWorker.findOne({ phone });

    if (worker) {
      if (!worker.isActive) {
        return res.status(403).json({ success: false, message: 'Account deactivated.' });
      }

      const loginSessionId = Date.now().toString();
      await SpWorker.findByIdAndUpdate(worker._id, {
        loginSessionId,
        $set: { fcmTokens: [], fcmTokenMobile: [] }
      });

      const tokens = generateTokenPair({
        userId: worker._id,
        role: SP_USER_ROLES.WORKER,
        loginSessionId
      });

      return res.status(200).json({
        success: true,
        isNewUser: false,
        message: 'Login successful',
        worker: {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          phone: worker.phone,
          status: worker.status,
          serviceCategories: worker.serviceCategories || []
        },
        ...tokens
      });

    } else {
      const verificationToken = generateVerificationToken(phone);

      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'OTP verified. Please complete registration.',
        verificationToken
      });
    }

  } catch (error) {
    console.error('Verify Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

/**
 * Register worker with Verification Token
 */
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, verificationToken, aadharNumber, aadharDocument, aadharBackDocument } = req.body;
    let phone = req.body.phone;

    if (verificationToken) {
      const verifiedPhone = verifyVerificationToken(verificationToken);
      if (!verifiedPhone) return res.status(400).json({ success: false, message: 'Invalid verification session.' });
      phone = verifiedPhone;
    } else {
      if (!req.body.otp) return res.status(400).json({ success: false, message: 'Verification required.' });
      const ver = await verifyOTP(phone, req.body.otp);
      if (!ver.success) return res.status(400).json({ success: false, message: ver.message });
    }

    const existingWorker = await SpWorker.findOne({ $or: [{ phone }, { email }] });
    if (existingWorker) {
      return res.status(400).json({
        success: false,
        message: 'Worker already exists. Please login.'
      });
    }

    // Upload Aadhar
    let aadharUrl = aadharDocument || null;
    let aadharBackUrl = aadharBackDocument || null;

    if (aadharUrl && aadharUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(aadharUrl, { folder: 'workers/documents' });
      if (uploadRes.success) aadharUrl = uploadRes.url;
    }

    if (aadharBackUrl && aadharBackUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(aadharBackUrl, { folder: 'workers/documents' });
      if (uploadRes.success) aadharBackUrl = uploadRes.url;
    }

    const worker = await SpWorker.create({
      name, email, phone,
      isPhoneVerified: true,
      aadhar: {
        number: req.body.aadhar || aadharNumber,
        document: aadharUrl,
        backDocument: aadharBackUrl
      },
      status: SP_WORKER_STATUS.OFFLINE
    });

    const loginSessionId = Date.now().toString();
    await SpWorker.findByIdAndUpdate(worker._id, { loginSessionId });

    const tokens = generateTokenPair({
      userId: worker._id,
      role: SP_USER_ROLES.WORKER,
      loginSessionId
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        status: worker.status
      },
      ...tokens
    });
  } catch (error) {
    console.error('Worker registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Login worker with OTP
 */
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, otp } = req.body;

    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    const worker = await SpWorker.findOne({ phone });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found. Please register first.'
      });
    }

    if (!worker.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }

    const loginSessionId = Date.now().toString();
    await SpWorker.findByIdAndUpdate(worker._id, {
      loginSessionId,
      $set: { fcmTokens: [], fcmTokenMobile: [] }
    });

    const tokens = generateTokenPair({
      userId: worker._id,
      role: SP_USER_ROLES.WORKER,
      loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        status: worker.status,
        serviceCategories: worker.serviceCategories || []
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * Logout worker
 */
export const logout = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;

    if (req.user && req.user.id) {
      const updateQuery = platform === 'mobile'
        ? { $set: { fcmTokenMobile: [], loginSessionId: null } }
        : { $set: { fcmTokens: [], loginSessionId: null } };

      await SpWorker.findByIdAndUpdate(req.user.id, updateQuery);
      console.log(`[AUTH] ✅ ${platform} session & tokens cleared for worker: ${req.user.id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Refresh Access Token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const worker = await SpWorker.findById(decoded.userId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    if (!worker.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    if (decoded.loginSessionId !== worker.loginSessionId) {
      return res.status(401).json({ success: false, message: 'LoggedIn on another device.' });
    }

    const tokens = generateTokenPair({
      userId: worker._id,
      role: SP_USER_ROLES.WORKER,
      loginSessionId: worker.loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};
