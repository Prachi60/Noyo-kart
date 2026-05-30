import SpVendor from '../../models/SpVendor.js';
import { generateOTP, hashOTP, storeOTP, verifyOTP, checkRateLimit } from '../../services/redisOtp.util.js';
import { generateTokenPair, verifyRefreshToken, generateVerificationToken, verifyVerificationToken } from '../../services/tokenService.js';
import { sendOTP as sendSMSOTP } from '../../services/smsService.js';
import * as cloudinaryService from '../../services/cloudinaryService.js';
import { SP_USER_ROLES, SP_VENDOR_STATUS } from '../../constants.js';
import { validationResult } from 'express-validator';
import SpAdmin from '../../models/SpAdmin.js';
import { createNotification } from '../notificationControllers/notificationController.js';

const sendOTP_handler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { phone } = req.body;
    const existingVendor = await SpVendor.findOne({ phone });
    if (existingVendor) {
      if (existingVendor.approvalStatus === SP_VENDOR_STATUS.PENDING) return res.status(200).json({ success: true, message: 'Your account is currently under review.', vendor: { adminApproval: 'pending' } });
      if (existingVendor.approvalStatus === SP_VENDOR_STATUS.REJECTED || existingVendor.approvalStatus === SP_VENDOR_STATUS.SUSPENDED) return res.status(403).json({ success: false, message: 'Account restricted.' });
    }
    const allowed = await checkRateLimit(phone);
    if (!allowed) return res.status(429).json({ success: false, message: 'Too many OTP requests.' });
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    await storeOTP(phone, otpHash);
    await sendSMSOTP(phone, otp);
    if (process.env.NODE_ENV === 'development' || process.env.USE_DEFAULT_OTP === 'true') console.log(`[DEV] Vendor OTP for ${phone}: ${otp}`);
    res.status(200).json({ success: true, message: 'OTP sent successfully', token: 'verification-pending' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) return res.status(400).json({ success: false, message: verification.message });
    const vendor = await SpVendor.findOne({ phone });
    if (vendor) {
      if (vendor.approvalStatus === SP_VENDOR_STATUS.REJECTED) return res.status(403).json({ success: false, message: 'Account rejected.' });
      if (vendor.approvalStatus === SP_VENDOR_STATUS.SUSPENDED) return res.status(403).json({ success: false, message: 'Account suspended.' });
      if (!vendor.isActive) return res.status(403).json({ success: false, message: 'Account deactivated.' });
      if (vendor.approvalStatus === SP_VENDOR_STATUS.PENDING) return res.status(200).json({ success: true, message: 'Your account is under review.', vendor: { adminApproval: 'pending' } });
      const loginSessionId = Date.now().toString();
      await SpVendor.findByIdAndUpdate(vendor._id, { loginSessionId, $set: { fcmTokens: [], fcmTokenMobile: [] } });
      const tokens = generateTokenPair({ userId: vendor._id, role: SP_USER_ROLES.VENDOR, loginSessionId });
      return res.status(200).json({ success: true, isNewUser: false, message: 'Login successful', vendor: { id: vendor._id, name: vendor.name, email: vendor.email, phone: vendor.phone, businessName: vendor.businessName, service: vendor.service, approvalStatus: vendor.approvalStatus }, ...tokens });
    } else {
      const verificationToken = generateVerificationToken(phone);
      return res.status(200).json({ success: true, isNewUser: true, message: 'OTP verified. Please complete registration.', verificationToken });
    }
  } catch (error) {
    console.error('Verify Login error:', error);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
};

const register = async (req, res) => {
  try {
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
    if (existing) return res.status(400).json({ success: false, message: 'Vendor already exists.' });
    let aadharUrl = req.body.aadharDocument || null;
    let aadharBackUrl = req.body.aadharBackDocument || null;
    let panUrl = req.body.panDocument || null;
    if (aadharUrl && aadharUrl.startsWith('data:')) { const r = await cloudinaryService.uploadFile(aadharUrl, { folder: 'vendors/documents' }); if (r.success) aadharUrl = r.url; }
    if (aadharBackUrl && aadharBackUrl.startsWith('data:')) { const r = await cloudinaryService.uploadFile(aadharBackUrl, { folder: 'vendors/documents' }); if (r.success) aadharBackUrl = r.url; }
    if (panUrl && panUrl.startsWith('data:')) { const r = await cloudinaryService.uploadFile(panUrl, { folder: 'vendors/documents' }); if (r.success) panUrl = r.url; }
    const vendor = await SpVendor.create({ name, email, phone, service: [], aadhar: { number: aadhar, document: aadharUrl, backDocument: aadharBackUrl }, pan: { number: pan, document: panUrl }, approvalStatus: SP_VENDOR_STATUS.PENDING, isPhoneVerified: true });
    try {
      const admins = await SpAdmin.find({ isActive: true }).select('_id');
      for (const admin of admins) {
        await createNotification({ adminId: admin._id, type: 'vendor_approval_request', title: '👤 New Vendor Registration', message: `${vendor.name} (${vendor.phone}) has registered`, relatedId: vendor._id, relatedType: 'vendor' });
      }
    } catch (e) { console.error('Notify error', e); }
    res.status(201).json({ success: true, message: 'Registration successful! Pending approval.', vendor: { id: vendor._id, name: vendor.name, email: vendor.email, phone: vendor.phone, approvalStatus: vendor.approvalStatus } });
  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { phone, otp } = req.body;
    const verification = await verifyOTP(phone, otp);
    if (!verification.success) return res.status(400).json({ success: false, message: verification.message });
    const vendor = await SpVendor.findOne({ phone });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
    if (vendor.approvalStatus === SP_VENDOR_STATUS.PENDING) return res.status(403).json({ success: false, message: 'Account pending approval.' });
    if (vendor.approvalStatus === SP_VENDOR_STATUS.REJECTED) return res.status(403).json({ success: false, message: 'Account rejected.' });
    if (vendor.approvalStatus === SP_VENDOR_STATUS.SUSPENDED) return res.status(403).json({ success: false, message: 'Account suspended.' });
    if (!vendor.isActive) return res.status(403).json({ success: false, message: 'Account deactivated.' });
    const loginSessionId = Date.now().toString();
    await SpVendor.findByIdAndUpdate(vendor._id, { loginSessionId, $set: { fcmTokens: [], fcmTokenMobile: [] } });
    const tokens = generateTokenPair({ userId: vendor._id, role: SP_USER_ROLES.VENDOR, loginSessionId });
    res.status(200).json({ success: true, message: 'Login successful', vendor: { id: vendor._id, name: vendor.name, email: vendor.email, phone: vendor.phone, businessName: vendor.businessName, service: vendor.service }, ...tokens });
  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

const logout = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;
    if (req.user && req.user.id) {
      const updateQuery = platform === 'mobile' ? { $set: { fcmTokenMobile: [], loginSessionId: null } } : { $set: { fcmTokens: [], loginSessionId: null } };
      await SpVendor.findByIdAndUpdate(req.user.id, updateQuery);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token is required' });
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    const vendor = await SpVendor.findById(decoded.userId);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    if (vendor.approvalStatus !== SP_VENDOR_STATUS.APPROVED || !vendor.isActive) return res.status(403).json({ success: false, message: 'Account not approved or inactive' });
    if (decoded.loginSessionId !== vendor.loginSessionId) return res.status(401).json({ success: false, message: 'Logged in on another device.' });
    const tokens = generateTokenPair({ userId: vendor._id, role: SP_USER_ROLES.VENDOR, loginSessionId: vendor.loginSessionId });
    res.status(200).json({ success: true, message: 'Token refreshed successfully', ...tokens });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
};

export { sendOTP_handler as sendOTP, verifyLogin, register, login, logout, refreshToken };
