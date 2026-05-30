import SpSettlement from '../../models/SpSettlement.js';
import SpVendor from '../../models/SpVendor.js';
import SpTransaction from '../../models/SpTransaction.js';
import SpWithdrawal from '../../models/SpWithdrawal.js';

export const getAllSettlements = async (req, res) => {
  try {
    const { status, vendorId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (vendorId) query.vendorId = vendorId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const settlements = await SpSettlement.find(query).populate('vendorId', 'name businessName phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpSettlement.countDocuments(query);
    res.status(200).json({ success: true, data: settlements, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get settlements error:', error); res.status(500).json({ success: false, message: 'Failed to fetch settlements' }); }
};

export const processSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId, notes } = req.body;
    const settlement = await SpSettlement.findById(id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
    settlement.status = status;
    if (transactionId) settlement.transactionId = transactionId;
    if (notes) settlement.notes = notes;
    if (status === 'completed') settlement.completedAt = new Date();
    await settlement.save();

    if (status === 'completed') {
      await SpVendor.findByIdAndUpdate(settlement.vendorId, { $inc: { 'wallet.dues': -settlement.amount } });
      await SpTransaction.create({ vendorId: settlement.vendorId, type: 'settlement', amount: settlement.amount, status: 'completed', paymentMethod: 'bank_transfer', description: `Settlement of ₹${settlement.amount} processed` });
    }
    res.status(200).json({ success: true, message: 'Settlement processed successfully', data: settlement });
  } catch (error) { console.error('Process settlement error:', error); res.status(500).json({ success: false, message: 'Failed to process settlement' }); }
};

export const getSettlementDashboard = async (req, res) => {
  try {
    const pendingSettlements = await SpSettlement.countDocuments({ status: 'pending' });
    const totalSettled = await SpSettlement.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const pendingWithdrawals = await SpWithdrawal.countDocuments({ status: 'pending' });
    res.status(200).json({ success: true, data: { pendingSettlements, totalSettled: totalSettled[0]?.total || 0, pendingWithdrawals } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch dashboard' }); }
};

export const getVendorBalances = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const vendors = await SpVendor.find().select('name businessName phone wallet isActive').sort({ 'wallet.dues': -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpVendor.countDocuments();
    res.status(200).json({ success: true, data: vendors, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch vendor balances' }); }
};

export const getVendorLedger = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const transactions = await SpTransaction.find({ vendorId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpTransaction.countDocuments({ vendorId });
    const vendor = await SpVendor.findById(vendorId).select('name businessName wallet');
    res.status(200).json({ success: true, data: { vendor, transactions }, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch vendor ledger' }); }
};

export const getPendingSettlements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const settlements = await SpSettlement.find({ status: 'pending' }).populate('vendorId', 'name businessName phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpSettlement.countDocuments({ status: 'pending' });
    res.status(200).json({ success: true, data: settlements, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch pending settlements' }); }
};

export const approveSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { adminNotes } = req.body;
    const settlement = await SpSettlement.findById(settlementId);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
    settlement.status = 'completed';
    settlement.processedBy = req.user.id;
    settlement.processedAt = new Date();
    if (adminNotes) settlement.adminNotes = adminNotes;
    await settlement.save();
    await SpVendor.findByIdAndUpdate(settlement.vendorId, { $inc: { 'wallet.dues': -settlement.amount, 'wallet.totalSettled': settlement.amount } });
    res.status(200).json({ success: true, message: 'Settlement approved', data: settlement });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to approve settlement' }); }
};

export const rejectSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { rejectionReason } = req.body;
    const settlement = await SpSettlement.findById(settlementId);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
    settlement.status = 'rejected';
    settlement.rejectionReason = rejectionReason;
    settlement.processedBy = req.user.id;
    settlement.processedAt = new Date();
    await settlement.save();
    res.status(200).json({ success: true, message: 'Settlement rejected', data: settlement });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to reject settlement' }); }
};

export const getSettlementHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const settlements = await SpSettlement.find(query).populate('vendorId', 'name businessName phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpSettlement.countDocuments(query);
    res.status(200).json({ success: true, data: settlements, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch settlement history' }); }
};

export const blockVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;
    await SpVendor.findByIdAndUpdate(vendorId, { 'wallet.isBlocked': true, 'wallet.blockedAt': new Date(), 'wallet.blockReason': reason || 'Blocked by admin' });
    res.status(200).json({ success: true, message: 'Vendor blocked' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to block vendor' }); }
};

export const unblockVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    await SpVendor.findByIdAndUpdate(vendorId, { 'wallet.isBlocked': false, 'wallet.blockedAt': null, 'wallet.blockReason': null });
    res.status(200).json({ success: true, message: 'Vendor unblocked' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to unblock vendor' }); }
};

export const updateCashLimit = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { cashLimit } = req.body;
    await SpVendor.findByIdAndUpdate(vendorId, { 'wallet.cashLimit': cashLimit });
    res.status(200).json({ success: true, message: 'Cash limit updated' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to update cash limit' }); }
};

export const getWithdrawalRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const withdrawals = await SpWithdrawal.find(query).populate('vendorId', 'name businessName phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await SpWithdrawal.countDocuments(query);
    res.status(200).json({ success: true, data: withdrawals, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' }); }
};

export const approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const withdrawal = await SpWithdrawal.findById(withdrawalId);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    withdrawal.status = 'approved';
    withdrawal.processedDate = new Date();
    withdrawal.processedBy = req.user.id;
    const tdsAmount = (withdrawal.amount * (withdrawal.tdsRate || 2)) / 100;
    const platformFee = (withdrawal.amount * (withdrawal.platformFeeRate || 0)) / 100;
    withdrawal.tdsAmount = tdsAmount;
    withdrawal.platformFeeAmount = platformFee;
    withdrawal.netAmount = withdrawal.amount - tdsAmount - platformFee;
    await withdrawal.save();
    await SpVendor.findByIdAndUpdate(withdrawal.vendorId, { $inc: { 'wallet.earnings': -withdrawal.amount, 'wallet.totalWithdrawn': withdrawal.amount } });
    res.status(200).json({ success: true, message: 'Withdrawal approved', data: withdrawal });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to approve withdrawal' }); }
};

export const rejectWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { rejectionReason } = req.body;
    const withdrawal = await SpWithdrawal.findById(withdrawalId);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = rejectionReason;
    withdrawal.processedDate = new Date();
    await withdrawal.save();
    res.status(200).json({ success: true, message: 'Withdrawal rejected', data: withdrawal });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to reject withdrawal' }); }
};
