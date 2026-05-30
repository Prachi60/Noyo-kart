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

// Get wallet with ledger balance
router.get('/wallet', authenticate, isVendor, getWallet);

// Get wallet summary for dashboard
router.get('/wallet/summary', authenticate, isVendor, getWalletSummary);

// Get transaction history/ledger
router.get('/wallet/transactions', authenticate, isVendor, getTransactions);

// Record cash collection
router.post('/wallet/cash-collection', authenticate, isVendor, cashCollectionValidation, recordCashCollection);

// Request settlement
router.post('/wallet/settlement', authenticate, isVendor, settlementValidation, requestSettlement);

// Pay worker for a booking
router.post('/wallet/pay-worker', authenticate, isVendor, payWorkerValidation, payWorker);

// Get settlement history
router.get('/wallet/settlements', authenticate, isVendor, getSettlements);

// Request withdrawal
router.post('/withdraw', authenticate, isVendor, [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('bankDetails').optional().isObject()
], requestWithdrawal);

// Get withdrawal history
router.get('/wallet/withdrawals', authenticate, isVendor, getWithdrawals);

export default router;
