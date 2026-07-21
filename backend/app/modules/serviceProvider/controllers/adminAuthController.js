import SpAdmin from '../models/SpAdmin.js';
import Admin from '../../../models/admin.js';
import jwt from 'jsonwebtoken';
import { generateTokenPair } from '../utils/tokenService.js';
import { SP_USER_ROLES } from '../constants.js';
import { validationResult } from 'express-validator';

/**
 * Login admin with email and password
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

    const { email, password } = req.body;

    let admin = await SpAdmin.findOne({ email }).select('+password');
    if (!admin && email === 'admin@admin.com') {
      // Auto-seed default admin for local dev and testing convenience
      console.log('[AUTO-SEED] Seeding default admin user: admin@admin.com');
      await SpAdmin.create({
        name: 'Super Admin',
        email: 'admin@admin.com',
        password: 'admin123',
        role: 'super_admin',
        isActive: true
      });
      // Retrieve again with select password
      admin = await SpAdmin.findOne({ email }).select('+password');
    }

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const tokens = generateTokenPair({
      userId: admin._id,
      role: SP_USER_ROLES.ADMIN
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        cityId: admin.cityId,
        cityName: admin.cityName
      },
      ...tokens
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Logout admin
 */
export const logout = async (req, res) => {
  try {
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
 * Update admin profile
 */
export const updateProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { email, currentPassword, newPassword } = req.body;

    const admin = await SpAdmin.findById(adminId).select('+password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (currentPassword) {
      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
    } else if (newPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required to set new password' });
    }

    if (email) admin.email = email;
    if (newPassword) admin.password = newPassword;

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * Get admin profile
 */
export const getProfile = async (req, res) => {
  try {
    const admin = await SpAdmin.findById(req.user.id).populate('cityId', 'name');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.status(200).json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        cityId: admin.cityId,
        cityName: admin.cityName
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

/**
 * SSO Login: Auto-login / clone admin using Quick Commerce admin token
 */
export const ssoAdminLogin = async (req, res) => {
  try {
    const { qcToken } = req.body;
    if (!qcToken) {
      return res.status(400).json({ success: false, message: 'Quick Commerce admin token is required for SSO' });
    }

    // Verify QC Token
    let decoded;
    try {
      decoded = jwt.verify(qcToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Quick Commerce admin token' });
    }

    if (!decoded || (!decoded.id && !decoded._id)) {
      return res.status(401).json({ success: false, message: 'Invalid admin token payload' });
    }
    const adminId = decoded.id || decoded._id;

    // Fetch QC Admin
    const qcAdmin = await Admin.findById(adminId).select('+password');
    if (!qcAdmin) {
      return res.status(404).json({ success: false, message: 'Quick Commerce admin not found' });
    }

    if (!qcAdmin.email) {
      return res.status(400).json({ success: false, message: 'Quick Commerce admin must have an email for SSO' });
    }

    // Find or Create SpAdmin in Service DB (separate from QC admins)
    let spAdmin = await SpAdmin.findOne({ email: qcAdmin.email });

    if (!spAdmin) {
      // Insert with QC password hash directly — SpAdmin pre-save would double-hash create()
      const inserted = await SpAdmin.collection.insertOne({
        name: qcAdmin.name || 'QC Admin',
        email: qcAdmin.email,
        password: qcAdmin.password,
        role: 'super_admin',
        cityId: null,
        cityName: '',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      spAdmin = await SpAdmin.findById(inserted.insertedId);
      console.log(`[SP ADMIN SSO] Cloned QC Admin (${qcAdmin.email}) to SpAdmin`);
    } else {
      spAdmin.lastLogin = new Date();
      await spAdmin.save();
    }

    // Treat missing isActive as active (legacy docs)
    if (spAdmin.isActive === false) {
      return res.status(403).json({ success: false, message: 'Your admin account has been deactivated.' });
    }

    const tokens = generateTokenPair({
      userId: spAdmin._id,
      role: SP_USER_ROLES.ADMIN
    });

    res.status(200).json({
      success: true,
      message: 'Admin SSO Login successful',
      admin: {
        id: spAdmin._id,
        name: spAdmin.name,
        email: spAdmin.email,
        role: spAdmin.role,
        cityId: spAdmin.cityId,
        cityName: spAdmin.cityName
      },
      ...tokens
    });
  } catch (error) {
    console.error('Admin SSO Login error:', error);
    res.status(500).json({ success: false, message: 'Admin SSO Login failed', errorMsg: error.message, stack: error.stack });
  }
};
