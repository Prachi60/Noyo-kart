import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { createPaymentOrder, verifyPayment, generateQRCode, checkQRPayment } from '../../controllers/paymentControllers/paymentController.js';

const router = Router();

router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/qr-code', authenticate, generateQRCode);
router.get('/qr-code/:qrCodeId/status', authenticate, checkQRPayment);

export default router;
