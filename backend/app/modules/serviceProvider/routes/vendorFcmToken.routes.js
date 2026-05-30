/**
 * Vendor FCM Token Routes
 * Manages FCM tokens for push notifications
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { sendPushNotification } from '../services/firebaseAdmin.js';
import SpVendor from '../models/SpVendor.js';

const router = Router();
const MAX_TOKENS = 10;

/**
 * POST /save - Save FCM token for vendor
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const vendorId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const pullQuery = platform === 'mobile'
      ? { $pull: { fcmTokenMobile: token } }
      : { $pull: { fcmTokens: token } };

    await SpVendor.findByIdAndUpdate(vendorId, pullQuery);

    const pushQuery = platform === 'mobile'
      ? { $push: { fcmTokenMobile: { $each: [token], $position: 0, $slice: MAX_TOKENS } } }
      : { $push: { fcmTokens: { $each: [token], $position: 0, $slice: MAX_TOKENS } } };

    const vendor = await SpVendor.findByIdAndUpdate(vendorId, pushQuery, { new: true });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * DELETE /remove - Remove FCM token for vendor
 */
router.delete('/remove', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const vendorId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const vendor = await SpVendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    if (platform === 'web' && vendor.fcmTokens) {
      vendor.fcmTokens = vendor.fcmTokens.filter(t => t !== token);
    } else if (platform === 'mobile' && vendor.fcmTokenMobile) {
      vendor.fcmTokenMobile = vendor.fcmTokenMobile.filter(t => t !== token);
    }

    await vendor.save();
    res.json({ success: true, message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' });
  }
});

/**
 * DELETE /remove-all - Remove ALL FCM tokens for a platform (logout)
 */
router.delete('/remove-all', authenticate, async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { platform = 'web' } = req.body;

    const updateQuery = platform === 'mobile'
      ? { $set: { fcmTokenMobile: [] } }
      : { $set: { fcmTokens: [] } };

    const vendor = await SpVendor.findByIdAndUpdate(vendorId, updateQuery, { new: true });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    console.log(`[FCM] All ${platform} tokens removed for vendor: ${vendorId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * POST /test - Send test notification to vendor (development only)
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await SpVendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const tokens = [...(vendor.fcmTokens || []), ...(vendor.fcmTokenMobile || [])];
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.json({ success: false, error: 'No FCM tokens found for vendor' });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: '🔔 Test Notification',
      body: 'This is a test notification for vendor!',
      data: { type: 'test', link: '/vendor/dashboard' }
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      successCount: response.successCount,
      failureCount: response.failureCount
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
