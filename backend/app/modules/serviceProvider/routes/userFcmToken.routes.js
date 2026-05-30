/**
 * User FCM Token Routes
 * Manages FCM tokens for push notifications
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { sendPushNotification } from '../services/firebaseAdmin.js';
import SpUser from '../models/SpUser.js';

const router = Router();
const MAX_TOKENS = 10;

/**
 * POST /save - Save FCM token for user
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // 1. Remove token if it exists (to avoid duplicates)
    const pullQuery = platform === 'mobile'
      ? { $pull: { fcmTokenMobile: token } }
      : { $pull: { fcmTokens: token } };

    await SpUser.findByIdAndUpdate(userId, pullQuery);

    // 2. Add token to front with limit
    const pushQuery = platform === 'mobile'
      ? { $push: { fcmTokenMobile: { $each: [token], $position: 0, $slice: MAX_TOKENS } } }
      : { $push: { fcmTokens: { $each: [token], $position: 0, $slice: MAX_TOKENS } } };

    const user = await SpUser.findByIdAndUpdate(userId, pushQuery, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * DELETE /remove - Remove FCM token for user
 */
router.delete('/remove', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const user = await SpUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (platform === 'web' && user.fcmTokens) {
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
    } else if (platform === 'mobile' && user.fcmTokenMobile) {
      user.fcmTokenMobile = user.fcmTokenMobile.filter(t => t !== token);
    }

    await user.save();
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
    const userId = req.user._id;
    const { platform = 'web' } = req.body;

    const updateQuery = platform === 'mobile'
      ? { $set: { fcmTokenMobile: [] } }
      : { $set: { fcmTokens: [] } };

    const user = await SpUser.findByIdAndUpdate(userId, updateQuery, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`[FCM] All ${platform} tokens removed for user: ${userId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * POST /test - Send test notification to user (development only)
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await SpUser.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.json({ success: false, error: 'No FCM tokens found for user' });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: '🔔 Test Notification',
      body: 'This is a test notification from Appzeto!',
      data: { type: 'test', link: '/' }
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
