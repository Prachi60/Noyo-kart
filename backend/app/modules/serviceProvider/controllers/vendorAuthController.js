import SpVendor from '../models/SpVendor.js';
import SpAdmin from '../models/SpAdmin.js';
import { generateOTP, hashOTP, storeOTP, verifyOTP, checkRateLimit } from '../utils/redisOtp.util.js';
import { generateTokenPair, verifyRefreshToken, generateVerificationToken, verifyVerificationToken } from '../utils/tokenService.js';
import { sendOTP as sendSMSOTP } from '../services/smsService.js';
import * as cloudinaryService from '../services/cloudinaryService.js';
import { SP_USER_ROLES, SP_VENDOR_STATUS } from '../constants.js';
import { validationResult } from 'express-validator';
import { createNotification } from './notificationController.js';

/**
 * Send OTP for vendor registration/login
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

    // Check existing vendor status
    const existingVendor = await SpVendor.findOne({ phone });
    if (existingVendor) {
      if (existingVendor.approvalStatus === SP_VENDOR_STATUS.PENDING) {
        return res.status(200).json({
          success: true,
          message: 'Your account is currently under review. Please wait for admin approval.',
          vendor: { adminApproval: 'pending' }
        });
      }
      if (existingVendor.approvalStatus === SP_VENDOR_STATUS.REJECTED || existingVendor.approvalStatus === SP_VENDOR_STATUS.SUSPENDED) {
        return res.status(403).json({ success: false, message: 'Account restricted.' });
      }
    }

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
      console.log(`[DEV] Vendor OTP for ${phone}: ${otp}`);
    }

    if (!smsResult.success) {
      console.warn(`[OTP] SMS failed for vendor ${phone}, but OTP stored`);
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
 * Verify OTP and Check Vendor Status (Unified Login/Signup Entry)
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

    const vendor = await SpVendor.findOne({ phone });

    if (vendor) {
      if (vendor.approvalStatus === SP_VENDOR_STATUS.REJECTED) {
        return res.status(403).json({ success: false, message: 'Account rejected.' });
      }
      if (vendor.approvalStatus === SP_VENDOR_STATUS.SUSPENDED) {
        return res.status(403).json({ success: false, message: 'Account suspended.' });
      }
      if (!vendor.isActive) {
        return res.status(403).json({ success: false, message: 'Account deactivated.' });
      }
      if (vendor.approvalStatus === SP_VENDOR_STATUS.PENDING) {
        return res.status(200).json({
          success: true,
          message: 'Your account is currently under review. Please wait for admin approval.',
          vendor: { adminApproval: 'pending' }
        });
      }

      const loginSessionId = Date.now().toString();
      await SpVendor.findByIdAndUpdate(vendor._id, {
        loginSessionId,
        $set: { fcmTokens: [], fcmTokenMobile: [] }
      });

      const tokens = generateTokenPair({
        userId: vendor._id,
        role: SP_USER_ROLES.VENDOR,
        loginSessionId
      });

      return res.status(200).json({
        success: true,
        isNewUser: false,
        message: 'Login successful',
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          businessName: vendor.businessName,
          service: vendor.service,
          approvalStatus: vendor.approvalStatus
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
 * Register vendor with Verification Token
 */
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    const validErrors = errors.array().filter(e => e.path !== 'service');

    if (validErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validErrors
      });
    }

    const { name, email, verificationToken, aadhar, pan } = req.body;
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

    const existing = await SpVendor.findOne({ $or: [{ phone }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Vendor already exists. Login.' });
    }

    // Upload documents
    let aadharUrl = req.body.aadharDocument || null;
    let aadharBackUrl = req.body.aadharBackDocument || null;
    let panUrl = req.body.panDocument || null;
    let otherUrls = req.body.otherDocuments || [];

    if (aadharUrl && aadharUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(aadharUrl, { folder: 'vendors/documents' });
      if (uploadRes.success) aadharUrl = uploadRes.url;
    }
    if (aadharBackUrl && aadharBackUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(aadharBackUrl, { folder: 'vendors/documents' });
      if (uploadRes.success) aadharBackUrl = uploadRes.url;
    }
    if (panUrl && panUrl.startsWith('data:')) {
      const uploadRes = await cloudinaryService.uploadFile(panUrl, { folder: 'vendors/documents' });
      if (uploadRes.success) panUrl = uploadRes.url;
    }
    if (otherUrls && otherUrls.length > 0) {
      const uploadedOthers = [];
      for (const doc of otherUrls) {
        if (doc && doc.startsWith('data:')) {
          const up = await cloudinaryService.uploadFile(doc, { folder: 'vendors/documents/others' });
          if (up.success) uploadedOthers.push(up.url);
        } else uploadedOthers.push(doc);
      }
      otherUrls = uploadedOthers;
    }

    const vendor = await SpVendor.create({
      name, email, phone,
      service: [],
      aadhar: {
        number: aadhar,
        document: aadharUrl,
        backDocument: aadharBackUrl
      },
      pan: { number: pan, document: panUrl },
      otherDocuments: otherUrls,
      approvalStatus: SP_VENDOR_STATUS.PENDING,
      isPhoneVerified: true
    });

    // Notify Admins
    try {
      const admins = await SpAdmin.find({ isActive: true }).select('_id');
      for (const admin of admins) {
        await createNotification({
          adminId: admin._id,
          type: 'vendor_approval_request',
          title: '👤 New Vendor Registration',
          message: `${vendor.name} (${vendor.phone}) has registered`,
          relatedId: vendor._id,
          relatedType: 'vendor',
          data: { vendorId: vendor._id, vendorName: vendor.name, phone: vendor.phone },
          pushData: { type: 'admin_alert', link: '/admin/vendors/all' }
        });
      }
    } catch (e) { console.error('Notify error', e); }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Pending approval.',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        approvalStatus: vendor.approvalStatus
      }
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed.'
    });
  }
};

/**
 * Login vendor with OTP (only if approved)
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

    const vendor = await SpVendor.findOne({ phone });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found. Please sign up first.'
      });
    }

    if (vendor.approvalStatus === SP_VENDOR_STATUS.PENDING) {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }
    if (vendor.approvalStatus === SP_VENDOR_STATUS.REJECTED) {
      return res.status(403).json({ success: false, message: 'Your account has been rejected.' });
    }
    if (vendor.approvalStatus === SP_VENDOR_STATUS.SUSPENDED) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }
    if (!vendor.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
    }

    const loginSessionId = Date.now().toString();
    await SpVendor.findByIdAndUpdate(vendor._id, {
      loginSessionId,
      $set: { fcmTokens: [], fcmTokenMobile: [] }
    });

    const tokens = generateTokenPair({
      userId: vendor._id,
      role: SP_USER_ROLES.VENDOR,
      loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        service: vendor.service
      },
      ...tokens
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Logout vendor
 */
export const logout = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;

    if (req.user && req.user.id) {
      const updateQuery = platform === 'mobile'
        ? { $set: { fcmTokenMobile: [], loginSessionId: null } }
        : { $set: { fcmTokens: [], loginSessionId: null } };

      await SpVendor.findByIdAndUpdate(req.user.id, updateQuery);
      console.log(`[AUTH] ✅ ${platform} session & tokens cleared for vendor: ${req.user.id}`);
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

    const vendor = await SpVendor.findById(decoded.userId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.approvalStatus !== SP_VENDOR_STATUS.APPROVED || !vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is not approved or is inactive'
      });
    }

    if (decoded.loginSessionId !== vendor.loginSessionId) {
      return res.status(401).json({
        success: false,
        message: 'Account logged in on a new device. Please login again.'
      });
    }

    const tokens = generateTokenPair({
      userId: vendor._id,
      role: SP_USER_ROLES.VENDOR,
      loginSessionId: vendor.loginSessionId
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
