import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isVendor } from '../middleware/roleMiddleware.js';
import {
  getWallet,
  getTransactions,
  recordCashCollection,
  requestSettlement,
  getSettlements,
  getWalletSummary,
  payWorker,
  requestWithdrawal,
  getWithdrawals
} from '../controllers/vendorControllers/vendorWalletController.js';

const router = Router();

const payWorkerValidation = [
  body('bookingId').notEmpty().withMessage('Booking ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('notes').optional().trim()
];

const cashCollectionValidation = [
  body('bookingId').notEmpty().withMessage('Booking ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required')
];

const settlementValidation = [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('paymentMethod').optional().isIn(['upi', 'bank_transfer', 'cash', 'other'])
];

const withdrawalValidation = [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('bankDetails').optional().isObject()
];

// Mounted at /vendors/wallet — paths below are relative to that mount
router.get('/', authenticate, isVendor, getWallet);
router.get('/summary', authenticate, isVendor, getWalletSummary);
router.get('/transactions', authenticate, isVendor, getTransactions);
router.post('/cash-collection', authenticate, isVendor, cashCollectionValidation, recordCashCollection);
router.post('/settlement', authenticate, isVendor, settlementValidation, requestSettlement);
router.post('/pay-worker', authenticate, isVendor, payWorkerValidation, payWorker);
router.get('/settlements', authenticate, isVendor, getSettlements);
router.get('/withdrawals', authenticate, isVendor, getWithdrawals);

// Frontend uses both /withdraw and /withdrawal
router.post('/withdraw', authenticate, isVendor, withdrawalValidation, requestWithdrawal);
router.post('/withdrawal', authenticate, isVendor, withdrawalValidation, requestWithdrawal);

export default router;
