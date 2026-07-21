/**
 * Service Provider Module - Route Index
 * Mounts all SP routes under /api/sp
 *
 * Usage in main app:
 *   import spRoutes from './app/modules/serviceProvider/routes/index.js';
 *   app.use('/api/sp', spRoutes);
 */

import { Router } from 'express';

// ==========================================
// USER ROUTES
// ==========================================
import userAuthRoutes from './userAuth.routes.js';
import userProfileRoutes from './userProfile.routes.js';
import userWalletRoutes from './userWallet.routes.js';
import userBookingRoutes from './userBooking.routes.js';
import userCartRoutes from './userCart.routes.js';
import userFcmTokenRoutes from './userFcmToken.routes.js';

// ==========================================
// VENDOR ROUTES
// ==========================================
import vendorAuthRoutes from './vendorAuth.routes.js';
import vendorProfileRoutes from './vendorProfile.routes.js';
import vendorSettingsRoutes from './vendorSettings.routes.js';
import vendorWalletRoutes from './vendorWallet.routes.js';
import vendorDashboardRoutes from './vendorDashboard.routes.js';
import vendorServiceRoutes from './vendorService.routes.js';
import vendorBookingRoutes from './vendorBooking.routes.js';
import vendorWorkerRoutes from './vendorWorker.routes.js';
import vendorFcmTokenRoutes from './vendorFcmToken.routes.js';
import vendorBillRoutes from './vendorBill.routes.js';
import vendorCatalogRoutes from './vendorCatalog.routes.js';

// ==========================================
// WORKER ROUTES
// ==========================================
import workerAuthRoutes from './workerAuth.routes.js';
import workerProfileRoutes from './workerProfile.routes.js';
import workerJobRoutes from './workerJob.routes.js';
import workerDashboardRoutes from './workerDashboard.routes.js';
import workerWalletRoutes from './workerWallet.routes.js';
import workerFcmTokenRoutes from './workerFcmToken.routes.js';

// ==========================================
// ADMIN ROUTES
// ==========================================
import adminAuthRoutes from './adminAuth.routes.js';
import adminDashboardRoutes from './adminDashboard.routes.js';
import adminUsersRoutes from './adminUsers.routes.js';
import adminVendorsRoutes from './adminVendors.routes.js';
import adminWorkersRoutes from './adminWorkers.routes.js';
import adminCategoriesRoutes from './adminCategories.routes.js';
import adminBrandsRoutes from './adminBrands.routes.js';
import adminServicesRoutes from './adminServices.routes.js';
import adminBookingsRoutes from './adminBookings.routes.js';
import adminPaymentsRoutes from './adminPayments.routes.js';
import adminTransactionsRoutes from './adminTransactions.routes.js';
import adminSettingsRoutes from './adminSettings.routes.js';
import adminHomeContentRoutes from './adminHomeContent.routes.js';
import adminPlansRoutes from './adminPlans.routes.js';
import adminReviewsRoutes from './adminReviews.routes.js';
import adminReportsRoutes from './adminReports.routes.js';
import adminSettlementsRoutes from './adminSettlements.routes.js';
import adminManagementRoutes from './adminManagement.routes.js';
import adminUploadRoutes from './adminUpload.routes.js';
import adminCitiesRoutes from './adminCities.routes.js';
import adminVendorCatalogRoutes, {
  adminVendorServicesRoutes,
  adminVendorPartsRoutes
} from './adminVendorCatalog.routes.js';

// ==========================================
// BOOKING ROUTES
// ==========================================
import cashCollectionRoutes from './cashCollection.routes.js';

// ==========================================
// PAYMENT ROUTES
// ==========================================
import paymentRoutes from './payment.routes.js';

// ==========================================
// NOTIFICATION ROUTES
// ==========================================
import notificationRoutes from './notification.routes.js';

// ==========================================
// OTHER ROUTES
// ==========================================
import scrapRoutes from './scrap.routes.js';

// ==========================================
// PUBLIC ROUTES
// ==========================================
import publicCitiesRoutes from './publicCities.routes.js';
import publicCatalogRoutes from './publicCatalog.routes.js';
import publicPlansRoutes from './publicPlans.routes.js';
import publicConfigRoutes from './publicConfig.routes.js';

const router = Router();

// ==========================================
// USER ROUTES
// ==========================================
router.use('/users/auth', userAuthRoutes);
router.use('/users', userProfileRoutes);
router.use('/users/wallet', userWalletRoutes);
router.use('/users/bookings', userBookingRoutes);
router.use('/users/cart', userCartRoutes);
router.use('/users/fcm-tokens', userFcmTokenRoutes);

// ==========================================
// VENDOR ROUTES
// ==========================================
router.use('/vendors/auth', vendorAuthRoutes);
router.use('/vendors', vendorProfileRoutes);
router.use('/vendors/settings', vendorSettingsRoutes);
router.use('/vendors/wallet', vendorWalletRoutes);
router.use('/vendors/dashboard', vendorDashboardRoutes);
router.use('/vendors/services', vendorServiceRoutes);
router.use('/vendors/bookings', vendorBookingRoutes);
router.use('/vendors/workers', vendorWorkerRoutes);
router.use('/vendors/fcm-tokens', vendorFcmTokenRoutes);
router.use('/vendors/bills', vendorBillRoutes);
router.use('/vendors/catalog', vendorCatalogRoutes);

// ==========================================
// WORKER ROUTES
// ==========================================
router.use('/workers/auth', workerAuthRoutes);
router.use('/workers', workerProfileRoutes);
router.use('/workers/jobs', workerJobRoutes);
router.use('/workers/dashboard', workerDashboardRoutes);
router.use('/workers/stats', workerDashboardRoutes); // alias — frontend expects /workers/stats
router.use('/workers/wallet', workerWalletRoutes);
router.use('/workers/fcm-tokens', workerFcmTokenRoutes);

// ==========================================
// ADMIN ROUTES
// ==========================================
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/dashboard', adminDashboardRoutes);
router.use('/admin/users', adminUsersRoutes);
router.use('/admin/vendors', adminVendorsRoutes);
router.use('/admin/workers', adminWorkersRoutes);
router.use('/admin/categories', adminCategoriesRoutes);
router.use('/admin/brands', adminBrandsRoutes);
router.use('/admin/services', adminServicesRoutes);
router.use('/admin/bookings', adminBookingsRoutes);
router.use('/admin/payments', adminPaymentsRoutes);
router.use('/admin/transactions', adminTransactionsRoutes);
router.use('/admin/settings', adminSettingsRoutes);
router.use('/admin/home-content', adminHomeContentRoutes);
router.use('/admin/plans', adminPlansRoutes);
router.use('/admin/reviews', adminReviewsRoutes);
router.use('/admin/reports', adminReportsRoutes);
router.use('/admin/settlements', adminSettlementsRoutes);
router.use('/admin/admins', adminManagementRoutes);
router.use('/admin/upload', adminUploadRoutes);
router.use('/admin/cities', adminCitiesRoutes);
router.use('/admin/vendor-catalog', adminVendorCatalogRoutes);
router.use('/admin/vendor-services', adminVendorServicesRoutes); // alias — frontend path
router.use('/admin/vendor-parts', adminVendorPartsRoutes); // alias — frontend path
router.use('/cities/public', publicCitiesRoutes); // alias — frontend cityService

// ==========================================
// BOOKING ROUTES
// ==========================================
router.use('/bookings/cash', cashCollectionRoutes);

// ==========================================
// PAYMENT ROUTES
// ==========================================
router.use('/payments', paymentRoutes);

// ==========================================
// NOTIFICATION ROUTES
// ==========================================
router.use('/notifications', notificationRoutes);

// ==========================================
// OTHER ROUTES
// ==========================================
router.use('/scrap', scrapRoutes);

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.use('/public/cities', publicCitiesRoutes);
router.use('/public/catalog', publicCatalogRoutes);
router.use('/public/plans', publicPlansRoutes);
router.use('/public/config', publicConfigRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Service Provider API is running',
    module: 'serviceProvider',
    timestamp: new Date().toISOString()
  });
});

export default router;
