/**
 * Worker FCM Token Routes
 * Manages FCM tokens for push notifications
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { sendPushNotification } from '../services/firebaseAdmin.js';
import SpWorker from '../models/SpWorker.js';

const router = Router();
const MAX_TOKENS = 10;

/**
 * POST /save - Save FCM token for worker
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const workerId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const updateQuery = platform === 'mobile'
      ? { $addToSet: { fcmTokenMobile: token } }
      : { $addToSet: { fcmTokens: token } };

    const worker = await SpWorker.findByIdAndUpdate(workerId, updateQuery, { new: true });

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    // Trim array if too long
    const currentTokens = platform === 'mobile' ? worker.fcmTokenMobile : worker.fcmTokens;
    if (currentTokens && currentTokens.length > MAX_TOKENS) {
      const sliceQuery = platform === 'mobile'
        ? { $push: { fcmTokenMobile: { $each: [], $slice: MAX_TOKENS } } }
        : { $push: { fcmTokens: { $each: [], $slice: MAX_TOKENS } } };
      await SpWorker.findByIdAndUpdate(workerId, sliceQuery);
    }

    res.json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * DELETE /remove - Remove FCM token for worker
 */
router.delete('/remove', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const workerId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const worker = await SpWorker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    if (platform === 'web' && worker.fcmTokens) {
      worker.fcmTokens = worker.fcmTokens.filter(t => t !== token);
    } else if (platform === 'mobile' && worker.fcmTokenMobile) {
      worker.fcmTokenMobile = worker.fcmTokenMobile.filter(t => t !== token);
    }

    await worker.save();
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
    const workerId = req.user._id;
    const { platform = 'web' } = req.body;

    const updateQuery = platform === 'mobile'
      ? { $set: { fcmTokenMobile: [] } }
      : { $set: { fcmTokens: [] } };

    const worker = await SpWorker.findByIdAndUpdate(workerId, updateQuery, { new: true });

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    console.log(`[FCM] All ${platform} tokens removed for worker: ${workerId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * POST /test - Send test notification to worker (development only)
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const workerId = req.user._id;
    const worker = await SpWorker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    const tokens = [...(worker.fcmTokens || []), ...(worker.fcmTokenMobile || [])];
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.json({ success: false, error: 'No FCM tokens found for worker' });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: '🔔 Test Notification',
      body: 'This is a test notification for worker!',
      data: { type: 'test', link: '/worker/dashboard' }
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
