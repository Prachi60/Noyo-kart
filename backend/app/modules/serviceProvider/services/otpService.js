import SpToken from '../models/SpToken.js';
import { generateOTP, generateToken } from '../utils/generateOTP.js';
import { SP_TOKEN_TYPES } from '../constants.js';

/**
 * Create OTP token
 * @param {Object} params - Token parameters
 * @returns {Promise<Object>} - Created token document
 */
export const createOTPToken = async ({ userId, email, phone, type, expiryMinutes = 10 }) => {
  // Delete any existing unused tokens of the same type
  const query = { type, isUsed: false };
  if (userId) query.userId = userId;
  if (email) query.email = email;
  if (phone) query.phone = phone;

  await SpToken.deleteMany(query);

  // Generate OTP and token
  const otp = generateOTP(6);
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Create token document
  const tokenDoc = await SpToken.create({
    userId: userId || null,
    email: email || null,
    phone: phone || null,
    type,
    token,
    otp,
    expiresAt
  });

  return {
    tokenDoc,
    otp,
    token
  };
};

/**
 * Verify OTP token
 * @param {Object} params - Verification parameters
 * @returns {Promise<Object>} - Verification result
 */
export const verifyOTPToken = async ({ email, phone, otp, type }) => {
  const query = { type, otp, isUsed: false };
  if (email) query.email = email;
  if (phone) query.phone = phone;

  const tokenDoc = await SpToken.findOne(query);

  if (!tokenDoc) {
    return {
      success: false,
      message: 'Invalid or expired OTP'
    };
  }

  // Check if token is expired
  if (new Date() > tokenDoc.expiresAt) {
    await SpToken.deleteOne({ _id: tokenDoc._id });
    return {
      success: false,
      message: 'OTP has expired. Please request a new one.'
    };
  }

  // Check attempts
  if (tokenDoc.attempts >= 5) {
    await SpToken.deleteOne({ _id: tokenDoc._id });
    return {
      success: false,
      message: 'Maximum attempts exceeded. Please request a new OTP.'
    };
  }

  // Increment attempts
  tokenDoc.attempts += 1;
  await tokenDoc.save();

  return {
    success: true,
    tokenDoc
  };
};

/**
 * Mark token as used
 * @param {string} tokenId - Token document ID
 * @returns {Promise<void>}
 */
export const markTokenAsUsed = async (tokenId) => {
  await SpToken.findByIdAndUpdate(tokenId, { isUsed: true });
};

/**
 * Get token by token string
 * @param {string} token - Token string
 * @param {string} type - Token type
 * @returns {Promise<Object>} - Token document
 */
export const getTokenByString = async (token, type) => {
  return await SpToken.findOne({ token, type, isUsed: false });
};
