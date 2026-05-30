/**
 * Firebase Admin Service - SP Module
 * Handles push notifications via FCM
 */

import SpUser from '../models/SpUser.js';
import SpVendor from '../models/SpVendor.js';
import SpWorker from '../models/SpWorker.js';
import SpAdmin from '../models/SpAdmin.js';

/**
 * Send push notification to a user
 */
const sendNotificationToUser = async (userId, payload) => {
  try {
    const user = await SpUser.findById(userId).select('fcmTokens fcmTokenMobile');
    if (!user) return;
    const tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];
    if (tokens.length === 0) return;
    await sendToTokens(tokens, payload);
  } catch (error) {
    console.error('[FCM] Send to user error:', error.message);
  }
};

/**
 * Send push notification to a vendor
 */
const sendNotificationToVendor = async (vendorId, payload) => {
  try {
    const vendor = await SpVendor.findById(vendorId).select('fcmTokens fcmTokenMobile');
    if (!vendor) return;
    const tokens = [...(vendor.fcmTokens || []), ...(vendor.fcmTokenMobile || [])];
    if (tokens.length === 0) return;
    await sendToTokens(tokens, payload);
  } catch (error) {
    console.error('[FCM] Send to vendor error:', error.message);
  }
};

/**
 * Send push notification to a worker
 */
const sendNotificationToWorker = async (workerId, payload) => {
  try {
    const worker = await SpWorker.findById(workerId).select('fcmTokens fcmTokenMobile');
    if (!worker) return;
    const tokens = [...(worker.fcmTokens || []), ...(worker.fcmTokenMobile || [])];
    if (tokens.length === 0) return;
    await sendToTokens(tokens, payload);
  } catch (error) {
    console.error('[FCM] Send to worker error:', error.message);
  }
};

/**
 * Send push notification to an admin
 */
const sendNotificationToAdmin = async (adminId, payload) => {
  try {
    const admin = await SpAdmin.findById(adminId).select('fcmTokens');
    if (!admin) return;
    const tokens = admin.fcmTokens || [];
    if (tokens.length === 0) return;
    await sendToTokens(tokens, payload);
  } catch (error) {
    console.error('[FCM] Send to admin error:', error.message);
  }
};

/**
 * Send to FCM tokens (placeholder - integrate with actual Firebase Admin SDK)
 */
const sendToTokens = async (tokens, payload) => {
  // TODO: Integrate with Firebase Admin SDK when configured
  console.log(`[FCM] Would send to ${tokens.length} tokens:`, payload.title);
};

/**
 * Send push notification (generic)
 */
const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return;
  await sendToTokens(tokens, { title, body, data });
};

export {
  sendNotificationToUser,
  sendNotificationToVendor,
  sendNotificationToWorker,
  sendNotificationToAdmin,
  sendPushNotification
};
