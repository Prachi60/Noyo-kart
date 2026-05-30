import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isVendor } from '../../middleware/roleMiddleware.js';
import { getWallet, getTransactions, recordCashCollection, requestSettlement, getSettlements, getWalletSummary, payWorker, requestWithdrawal, getWithdrawals } from '../../controllers/vendorControllers/vendorWalletController.js';

const router = Router();

router.get('/wallet', authenticate, isVendor, getWallet);
router.get('/wallet/summary', authenticate, isVendor, getWalletSummary);
router.get('/wallet/transactions', authenticate, isVendor, getTransactions);
router.post('/wallet/cash-collection', authenticate, isVendor, recordCashCollection);
router.post('/wallet/settlement', authenticate, isVendor, requestSettlement);
router.get('/wallet/settlements', authenticate, isVendor, getSettlements);
router.post('/wallet/withdrawal', authenticate, isVendor, requestWithdrawal);
router.get('/wallet/withdrawals', authenticate, isVendor, getWithdrawals);
router.post('/wallet/pay-worker', authenticate, isVendor, payWorker);

export default router;
