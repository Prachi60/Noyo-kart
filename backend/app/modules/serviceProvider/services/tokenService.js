import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sp-default-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sp-default-refresh-secret';
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET || 'sp-verification-secret';

/**
 * Generate access + refresh token pair
 */
const generateTokenPair = (payload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate verification token (for phone verification flow)
 */
const generateVerificationToken = (phone) => {
  return jwt.sign({ phone }, VERIFICATION_SECRET, { expiresIn: '10m' });
};

/**
 * Verify verification token
 */
const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, VERIFICATION_SECRET);
    return decoded.phone;
  } catch (error) {
    return null;
  }
};

export {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  generateVerificationToken,
  verifyVerificationToken
};
