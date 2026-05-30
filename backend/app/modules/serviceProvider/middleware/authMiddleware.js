import { verifyAccessToken } from '../utils/tokenService.js';
import SpUser from '../models/SpUser.js';
import SpVendor from '../models/SpVendor.js';
import SpWorker from '../models/SpWorker.js';
import SpAdmin from '../models/SpAdmin.js';
import { SP_USER_ROLES } from '../constants.js';

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.'
      });
    }

    // Get user based on role
    let user;
    switch (decoded.role) {
      case SP_USER_ROLES.USER:
        user = await SpUser.findById(decoded.userId).select('-password').lean();
        // SINGLE DEVICE LOGOUT Logic
        if (user && user.loginSessionId && decoded.loginSessionId && user.loginSessionId !== decoded.loginSessionId) {
          return res.status(401).json({ success: false, message: 'Account logged in on another device. Please login again.' });
        }
        break;
      case SP_USER_ROLES.VENDOR:
        user = await SpVendor.findById(decoded.userId).select('-password').lean();
        if (user && user.approvalStatus !== 'approved') {
          return res.status(403).json({
            success: false,
            message: 'Your vendor account is pending approval or has been rejected.'
          });
        }
        // SINGLE DEVICE LOGOUT Logic
        if (user && user.loginSessionId && decoded.loginSessionId && user.loginSessionId !== decoded.loginSessionId) {
          return res.status(401).json({
            success: false,
            message: 'Account logged in on another device. Please login again.'
          });
        }
        break;
      case SP_USER_ROLES.WORKER:
        user = await SpWorker.findById(decoded.userId).select('-password').lean();
        // SINGLE DEVICE LOGOUT Logic
        if (user && user.loginSessionId && decoded.loginSessionId && user.loginSessionId !== decoded.loginSessionId) {
          return res.status(401).json({ success: false, message: 'Account logged in on another device. Please login again.' });
        }
        break;
      case SP_USER_ROLES.ADMIN:
      case 'super_admin':
      case 'admin':
      case 'ADMIN':
        user = await SpAdmin.findById(decoded.userId).select('-password').lean();
        break;
      default:
        console.error('Role mismatch in middleware:', decoded.role);
        return res.status(401).json({
          success: false,
          message: 'Invalid user role.'
        });
    }

    if (!user) {
      console.error('User not found for ID:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }

    // Attach user to request
    req.user = { ...user, id: user._id.toString() };
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.'
    });
  }
};
