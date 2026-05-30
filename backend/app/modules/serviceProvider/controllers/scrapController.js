import SpScrap from '../models/SpScrap.js';
import SpUser from '../models/SpUser.js';
import SpAdmin from '../models/SpAdmin.js';
import { validationResult } from 'express-validator';
import { createNotification } from './notificationControllers/notificationController.js';
import { SP_USER_ROLES } from '../constants.js';

/**
 * Create a new scrap item (User)
 */
const createScrap = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, description, images, address } = req.body;

    const scrap = new SpScrap({
      userId: req.user.id,
      title,
      description,
      images,
      address
    });

    await scrap.save();

    // Fetch user details for notification
    const user = await SpUser.findById(req.user.id);

    // Notify User
    await createNotification({
      userId: req.user.id,
      type: 'scrap_listed',
      title: 'Scrap Listed Successfully',
      message: `Your scrap item "${scrap.title}" has been listed. Vendors in your area will be notified.`,
      relatedId: scrap._id,
      relatedType: 'scrap'
    });

    // Notify Admins
    const admins = await SpAdmin.find({});
    for (const admin of admins) {
      await createNotification({
        adminId: admin._id,
        type: 'new_scrap_added',
        title: 'New Scrap Item',
        message: `${user ? user.name : 'A user'} has added a new scrap item: "${scrap.title}"`,
        relatedId: scrap._id,
        relatedType: 'scrap'
      });
    }

    res.status(201).json({
      success: true,
      data: scrap,
      message: 'Scrap item listed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Get list of scrap items for the logged-in user
 */
const getMyScrap = async (req, res) => {
  try {
    const scraps = await SpScrap.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: scraps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Get scrap items accepted by vendor
 */
const getMyAcceptedScrap = async (req, res) => {
  try {
    const scraps = await SpScrap.find({ vendorId: req.user.id })
      .populate('userId', 'name phone address')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: scraps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Get all pending scrap items (Vendor view)
 */
const getAvailableScrap = async (req, res) => {
  try {
    const scraps = await SpScrap.find({ status: 'pending' })
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: scraps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Vendor accepts/buys a scrap request
 */
const acceptScrap = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;

    const scrap = await SpScrap.findById(id);
    if (!scrap) return res.status(404).json({ success: false, message: 'Scrap item not found' });

    if (scrap.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Item already taken or cancelled' });
    }

    scrap.status = 'accepted';
    scrap.vendorId = vendorId;
    scrap.pickupDate = new Date();
    await scrap.save();

    // Customize message based on acceptor role
    const isVendor = req.userRole === SP_USER_ROLES.VENDOR;
    const acceptorType = isVendor ? 'A vendor' : 'An admin';

    // Notify User
    await createNotification({
      userId: scrap.userId,
      type: 'scrap_accepted',
      title: 'Scrap Request Accepted!',
      message: `${acceptorType} has accepted your scrap request for "${scrap.title}". They will contact you shortly.`,
      relatedId: scrap._id,
      relatedType: 'scrap'
    });

    res.json({ success: true, data: scrap, message: 'Request accepted. Please contact user for pickup.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Vendor marks item as picked up / completed
 */
const completeScrap = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPrice } = req.body;

    const scrap = await SpScrap.findById(id);
    if (!scrap) return res.status(404).json({ success: false, message: 'Scrap item not found' });

    // Check if the user is the assigned vendor OR an admin
    const isAdmin = req.userRole === SP_USER_ROLES.ADMIN || req.userRole === 'admin' || req.userRole === 'super_admin';

    if (scrap.vendorId && scrap.vendorId.toString() !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    scrap.status = 'completed';
    if (finalPrice) scrap.finalPrice = finalPrice;
    await scrap.save();

    // Notify User
    await createNotification({
      userId: scrap.userId,
      type: 'scrap_completed',
      title: 'Scrap Pickup Completed',
      message: `Your scrap item "${scrap.title}" has been successfully picked up and completed.`,
      relatedId: scrap._id,
      relatedType: 'scrap'
    });

    res.json({ success: true, data: scrap, message: 'Transactions completed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Admin: Get all scrap items
 */
const getAllScrapAdmin = async (req, res) => {
  try {
    const scraps = await SpScrap.find({})
      .populate('userId', 'name email phone')
      .populate('vendorId', 'name businessName phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: scraps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Get single scrap by ID
 */
const getScrapById = async (req, res) => {
  try {
    const scrap = await SpScrap.findById(req.params.id)
      .populate('userId', 'name phone email profilePhoto')
      .populate('vendorId', 'name businessName phone profilePhoto');

    if (!scrap) {
      return res.status(404).json({ success: false, message: 'Scrap not found' });
    }

    res.json({ success: true, data: scrap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Delete scrap item
 */
const deleteScrap = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const scrap = await SpScrap.findById(id);
    if (!scrap) return res.status(404).json({ success: false, message: 'Scrap item not found' });

    // Authorization check
    const isOwner = scrap.userId.toString() === userId;
    const isAdmin = ['ADMIN', 'admin', 'super_admin'].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this item' });
    }

    await SpScrap.findByIdAndDelete(id);

    res.json({ success: true, message: 'Scrap item deleted successfully' });
  } catch (error) {
    console.error('Delete scrap error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export {
  createScrap,
  getMyScrap,
  getMyAcceptedScrap,
  getAvailableScrap,
  acceptScrap,
  completeScrap,
  getAllScrapAdmin,
  getScrapById,
  deleteScrap
};
