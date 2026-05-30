import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isUser } from '../../middleware/roleMiddleware.js';
import { getWalletBalance, addMoneyToWallet, verifyWalletTopup, getWalletTransactions } from '../../controllers/userControllers/userWalletController.js';

const router = Router();

router.get('/balance', authenticate, isUser, getWalletBalance);
router.post('/add-money', authenticate, isUser, addMoneyToWallet);
router.post('/verify-topup', authenticate, isUser, verifyWalletTopup);
router.get('/transactions', authenticate, isUser, getWalletTransactions);

export default router;
