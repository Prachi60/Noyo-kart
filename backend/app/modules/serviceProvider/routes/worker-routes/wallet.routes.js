import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isWorker } from '../../middleware/roleMiddleware.js';
import { getWallet, getTransactions, requestPayout } from '../../controllers/workerControllers/workerWalletController.js';

const router = Router();

router.get('/wallet', authenticate, isWorker, getWallet);
router.get('/wallet/transactions', authenticate, isWorker, getTransactions);
router.post('/wallet/request-payout', authenticate, isWorker, requestPayout);

export default router;
