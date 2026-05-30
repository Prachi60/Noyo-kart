import SpUser from '../../models/SpUser.js';
import { generateTokenPair, verifyRefreshToken, generateVerificationToken, verifyVerificationToken } from '../../services/tokenService.js';
import { generateOTP, hashOTP, storeOTP, verifyOTP, checkRateLimit } from '../../services/redisOtp.util.js';
import { sendOTP as sendSMSOTP } from '../../services/smsService.js';
import { sendOTPEmail, sendWelcomeEmail } from '../../services/emailService.js';
import { SP_USER_ROLES } from '../../constants.js';
import { validationResult } from 'express-validator';

const sendOTP_handler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { phone, email } = req.body;
    const allowed = await checkRateLimit(phone);
    if (!allowed) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Please try again after 10 minutes.' });
    }
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    await storeOTP(phone, otpHash);
    const smsResult = await sendSMSOTP(phone, otp);
    if (process.env.NODE_ENV === 'development' || process.env.USE_DEFAULT_OTP === 'true') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }
    if (email) { await sendOTPEmail(email, otp, 'verification'); }
    if (!smsResult.success) { console.warn(`[OTP] SMS failed for ${phone}, but OTP stored`); }
    res.status(200).json({ success: true, message: 'OTP sent successfully', token: 'verification-pending' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    const user = await SpUser.findOne({ phone });
    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
      }
      const loginSessionId = Date.now().toString();
      await SpUser.findByIdAndUpdate(user._id, { loginSessionId, $set: { fcmTokens: [], fcmTokenMobile: [] } });
      const tokens = generateTokenPair({ userId: user._id, role: SP_USER_ROLES.USER, loginSessionId });
      return res.status(200).json({
        success: true, isNewUser: false, message: 'Login successful',
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, isPhoneVerified: user.isPhoneVerified, isEmailVerified: user.isEmailVerified },
        ...tokens
      });
    } else {
      const verificationToken = generateVerificationToken(phone);
      return res.status(200).json({ success: true, isNewUser: true, message: 'OTP verified. Please complete registration.', verificationToken });
    }
  } catch (error) {
    console.error('Verify Login error:', error);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { name, email, verificationToken } = req.body;
    let phone = req.body.phone;
    if (verificationToken) {
      const verifiedPhone = verifyVerificationToken(verificationToken);
      if (!verifiedPhone) return res.status(400).json({ success: false, message: 'Invalid or expired verification session.' });
      phone = verifiedPhone;
    } else {
      if (!req.body.otp) return res.status(400).json({ success: false, message: 'Verification token or OTP required.' });
      const verification = await verifyOTP(phone, req.body.otp);
      if (!verification.success) return res.status(400).json({ success: false, message: verification.message });
    }
    const existingUser = await SpUser.findOne({ phone });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists. Please login.' });
    const user = await SpUser.create({ name, email: email || null, phone, isPhoneVerified: true, isEmailVerified: email ? false : true });
    if (email) { sendWelcomeEmail(email, name).catch(err => console.error(err)); }
    const loginSessionId = Date.now().toString();
    await SpUser.findByIdAndUpdate(user._id, { loginSessionId });
    const tokens = generateTokenPair({ userId: user._id, role: SP_USER_ROLES.USER, loginSessionId });
    res.status(201).json({
      success: true, message: 'Registration successful',
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, isPhoneVerified: user.isPhoneVerified, isEmailVerified: user.isEmailVerified },
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { phone, otp } = req.body;
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) return res.status(400).json({ success: false, message: verification.message });
    const user = await SpUser.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'User not found. Please sign up first.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
    const loginSessionId = Date.now().toString();
    await SpUser.findByIdAndUpdate(user._id, { loginSessionId, $set: { fcmTokens: [], fcmTokenMobile: [] } });
    const tokens = generateTokenPair({ userId: user._id, role: SP_USER_ROLES.USER, loginSessionId });
    res.status(200).json({
      success: true, message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, isPhoneVerified: user.isPhoneVerified, isEmailVerified: user.isEmailVerified },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

const logout = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;
    if (req.user && req.user.id) {
      const updateQuery = platform === 'mobile'
        ? { $set: { fcmTokenMobile: [], loginSessionId: null } }
        : { $set: { fcmTokens: [], loginSessionId: null } };
      await SpUser.findByIdAndUpdate(req.user.id, updateQuery);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token is required' });
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    const user = await SpUser.findById(decoded.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is not active' });
    if (decoded.loginSessionId !== user.loginSessionId) return res.status(401).json({ success: false, message: 'LoggedIn on another device.' });
    const tokens = generateTokenPair({ userId: user._id, role: SP_USER_ROLES.USER, loginSessionId: user.loginSessionId });
    res.status(200).json({ success: true, message: 'Token refreshed successfully', ...tokens });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
};

export { sendOTP_handler as sendOTP, verifyLogin, register, login, logout, refreshToken };
