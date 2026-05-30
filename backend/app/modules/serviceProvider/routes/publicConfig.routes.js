import { Router } from 'express';
import SpSettings from '../models/SpSettings.js';

const router = Router();

router.get('/config', async (req, res) => {
  try {
    const settings = await SpSettings.findOne({ type: 'global' }).select(
      'companyName supportEmail supportPhone supportWhatsapp currency isOnlinePaymentEnabled cancellationPenalty visitedCharges'
    );
    res.status(200).json({ success: true, data: settings || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch config' });
  }
});

export default router;
