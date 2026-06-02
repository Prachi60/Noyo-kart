import { Router } from 'express';
import SpSettings from '../models/SpSettings.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const settings = await SpSettings.findOne({ type: 'global' }).select(
      'companyName supportEmail supportPhone supportWhatsapp currency isOnlinePaymentEnabled cancellationPenalty visitedCharges landingJoinUs faqCategories appVersion aboutAppName accountMenus aboutUs cancellationPolicyText bottomNavigation vendorBottomNavigation vendorAccountMenus workerBottomNavigation adminSidebarMenus adminBottomNavigation'
    );
    
    // Inject default admin menus if they are missing in the database
    let responseSettings = settings ? settings.toObject() : {};
    if (!responseSettings.adminSidebarMenus || responseSettings.adminSidebarMenus.length === 0) {
      responseSettings.adminSidebarMenus = SpSettings.schema.path('adminSidebarMenus').defaultValue;
    }
    if (!responseSettings.adminBottomNavigation || responseSettings.adminBottomNavigation.length === 0) {
      responseSettings.adminBottomNavigation = SpSettings.schema.path('adminBottomNavigation').defaultValue;
    }

    res.status(200).json({ success: true, settings: responseSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch config' });
  }
});

export default router;
