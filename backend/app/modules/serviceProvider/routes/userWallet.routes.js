import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { isUser } from '../middleware/roleMiddleware.js';
import {
  getWalletBalance,
  addMoneyToWallet,
  verifyWalletTopup,
  getWalletTransactions
} from '../controllers/userControllers/userWalletController.js';

const router = Router();

const addMoneyValidation = [
  body('amount').isFloat({ min: 100 }).withMessage('Minimum amount is ₹100')
];

const verifyTopupValidation = [
  body('razorpay_order_id').trim().notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').trim().notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').trim().notEmpty().withMessage('Signature is required'),
  body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least ₹100')
];

router.get('/balance', authenticate, isUser, getWalletBalance);
router.post('/add-money', authenticate, isUser, addMoneyValidation, addMoneyToWallet);
router.post('/verify-topup', authenticate, isUser, verifyTopupValidation, verifyWalletTopup);
router.get('/transactions', authenticate, isUser, getWalletTransactions);

export default router;
