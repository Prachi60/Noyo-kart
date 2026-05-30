import { SP_USER_ROLES } from '../constants.js';

/**
 * Role-based authorization middleware
 */
export const isUser = (req, res, next) => {
  if (req.userRole !== SP_USER_ROLES.USER) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User role required.'
    });
  }
  next();
};

export const isVendor = (req, res, next) => {
  if (req.userRole !== SP_USER_ROLES.VENDOR) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Vendor role required.'
    });
  }
  next();
};

export const isWorker = (req, res, next) => {
  if (req.userRole !== SP_USER_ROLES.WORKER) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Worker role required.'
    });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (req.userRole !== SP_USER_ROLES.ADMIN && req.userRole !== 'super_admin' && req.userRole !== 'admin' && req.userRole !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  next();
};

export const isAdminOrVendor = (req, res, next) => {
  if (req.userRole !== SP_USER_ROLES.ADMIN && req.userRole !== 'super_admin' && req.userRole !== SP_USER_ROLES.VENDOR) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Vendor role required.'
    });
  }
  next();
};

/**
 * Super Admin only middleware
 */
export const isSuperAdmin = async (req, res, next) => {
  try {
    // Currently passes through (same as source)
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
};
