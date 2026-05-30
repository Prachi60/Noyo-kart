import SpUser from '../models/SpUser.js';
import Customer from '../../../models/customer.js';
import { generateTokenPair, verifyRefreshToken, generateVerificationToken, verifyVerificationToken } from '../utils/tokenService.js';
import { generateOTP, hashOTP, storeOTP, verifyOTP, checkRateLimit } from '../utils/redisOtp.util.js';
import { sendOTP as sendSMSOTP } from '../services/smsService.js';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService.js';
import { SP_USER_ROLES } from '../constants.js';
import { validationResult } from 'express-validator';

/**
 * Send OTP for user registration/login
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

    // 1. Rate limit check
    const allowed = await checkRateLimit(phone);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after 10 minutes.'
      });
    }

    // 2. Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // 3. Store OTP (Redis primary, MongoDB fallback)
    await storeOTP(phone, otpHash);

    // 4. Send OTP via SMS
    const smsResult = await sendSMSOTP(phone, otp);

    // Log OTP in development mode only
    if (process.env.NODE_ENV === 'development' || process.env.USE_DEFAULT_OTP === 'true') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }

    // 5. Optional: Send email notification if email provided
    if (email) {
      await sendOTPEmail(email, otp, 'verification');
    }

    if (!smsResult.success) {
      console.warn(`[OTP] SMS failed for ${phone}, but OTP stored for manual entry`);
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
 * Verify OTP and Check User Status (Unified Login/Signup Entry)
 */
export const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // 1. Verify OTP
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // 2. Check if user exists
    let user = await SpUser.findOne({ phone });

    if (!user) {
      // DYNAMIC DB CROSS-LOGIN: If customer exists in E-commerce, auto-clone to Service Provider
      const customer = await Customer.findOne({ phone });
      if (customer) {
        user = await SpUser.create({
          name: customer.name || 'Noyo Customer',
          email: customer.email || null,
          phone: customer.phone,
          isPhoneVerified: true,
          isEmailVerified: customer.email ? true : false,
          addresses: customer.addresses ? customer.addresses.map(addr => ({
            type: addr.label || 'home',
            addressLine1: addr.fullAddress,
            city: addr.city || '',
            state: addr.state || '',
            pincode: addr.pincode || '',
            landmark: addr.landmark || ''
          })) : []
        });
        console.log(`[SP AUTH] Dynamic DB Sync: Cloned E-commerce Customer (${phone}) to SpUser`);
      }
    }

    if (user) {
      // EXISTING USER -> LOGIN
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated.'
        });
      }

      // SINGLE DEVICE LOGIN: Update Session ID & Clear OLD FCM tokens
      const loginSessionId = Date.now().toString();
      await SpUser.findByIdAndUpdate(user._id, {
        loginSessionId,
        $set: { fcmTokens: [], fcmTokenMobile: [] }
      });

      const tokens = generateTokenPair({
        userId: user._id,
        role: SP_USER_ROLES.USER,
        loginSessionId
      });

      return res.status(200).json({
        success: true,
        isNewUser: false,
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified
        },
        ...tokens
      });

    } else {
      // NEW USER -> RETURN VERIFICATION TOKEN
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
 * Register user with Verification Token
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

    const { name, email, verificationToken } = req.body;
    let phone = req.body.phone;

    // Verify token if provided
    if (verificationToken) {
      const verifiedPhone = verifyVerificationToken(verificationToken);
      if (!verifiedPhone) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification session. Please verify phone again.'
        });
      }
      phone = verifiedPhone;
    } else {
      if (!req.body.otp) {
        return res.status(400).json({ success: false, message: 'Verification token or OTP required.' });
      }
      const verification = await verifyOTP(phone, req.body.otp);
      if (!verification.success) {
        return res.status(400).json({ success: false, message: verification.message });
      }
    }

    // Check if user already exists
    const existingUser = await SpUser.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists. Please login.'
      });
    }

    // Create user
    const user = await SpUser.create({
      name,
      email: email || null,
      phone,
      isPhoneVerified: true,
      isEmailVerified: email ? false : true
    });

    // Send Welcome Email
    if (email) {
      sendWelcomeEmail(email, name).catch(err => console.error(err));
    }

    // Generate JWT tokens with session
    const loginSessionId = Date.now().toString();
    await SpUser.findByIdAndUpdate(user._id, { loginSessionId });

    const tokens = generateTokenPair({
      userId: user._id,
      role: SP_USER_ROLES.USER,
      loginSessionId
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified
      },
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Login user with OTP
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

    let user = await SpUser.findOne({ phone });
    if (!user) {
      // DYNAMIC DB CROSS-LOGIN: If customer exists in E-commerce, auto-clone to Service Provider
      const customer = await Customer.findOne({ phone });
      if (customer) {
        user = await SpUser.create({
          name: customer.name || 'Noyo Customer',
          email: customer.email || null,
          phone: customer.phone,
          isPhoneVerified: true,
          isEmailVerified: customer.email ? true : false,
          addresses: customer.addresses ? customer.addresses.map(addr => ({
            type: addr.label || 'home',
            addressLine1: addr.fullAddress,
            city: addr.city || '',
            state: addr.state || '',
            pincode: addr.pincode || '',
            landmark: addr.landmark || ''
          })) : []
        });
        console.log(`[SP AUTH] Dynamic DB Sync: Cloned E-commerce Customer (${phone}) to SpUser`);
      } else {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please sign up first.'
        });
      }
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    const loginSessionId = Date.now().toString();
    await SpUser.findByIdAndUpdate(user._id, {
      loginSessionId,
      $set: { fcmTokens: [], fcmTokenMobile: [] }
    });

    const tokens = generateTokenPair({
      userId: user._id,
      role: SP_USER_ROLES.USER,
      loginSessionId
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;

    if (req.user && req.user.id) {
      const updateQuery = platform === 'mobile'
        ? { $set: { fcmTokenMobile: [], loginSessionId: null } }
        : { $set: { fcmTokens: [], loginSessionId: null } };

      await SpUser.findByIdAndUpdate(req.user.id, updateQuery);
      console.log(`[AUTH] ✅ ${platform} session & tokens cleared for user: ${req.user.id}`);
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

    const user = await SpUser.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    if (decoded.loginSessionId !== user.loginSessionId) {
      return res.status(401).json({ success: false, message: 'LoggedIn on another device.' });
    }

    const tokens = generateTokenPair({
      userId: user._id,
      role: SP_USER_ROLES.USER,
      loginSessionId: user.loginSessionId
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
