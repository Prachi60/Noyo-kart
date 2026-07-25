import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import PageTransition from '../components/common/PageTransition';
import BottomNav from '../components/layout/BottomNav';
import Footer from '../components/layout/Footer';
import ErrorBoundary from '../components/common/ErrorBoundary';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import PublicRoute from '../../components/auth/PublicRoute';

// Lazy load wrapper with error handling
const lazyLoad = (importFunc) => {
  return lazy(() => {
    return Promise.resolve(importFunc()).catch((error) => {
      console.error('User Module - Lazy Load Error:', error);
      return Promise.resolve({
        default: () => (
          <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-lg w-full border border-red-100">
              <div className="text-5xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Failed to load page</h2>
              <p className="text-gray-600 mb-6">Something went wrong while loading this section.</p>

              <div className="bg-red-50 p-4 rounded-xl text-left border border-red-100 mb-6 max-h-40 overflow-auto">
                <p className="text-xs font-mono text-red-600 underline mb-2">Error Details:</p>
                <code className="text-xs text-red-700 whitespace-pre-wrap">
                  {error?.message || 'Unknown loading error'}
                </code>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 rounded-xl text-white font-bold transition-all duration-300 hover:opacity-90 active:scale-95 shadow-lg shadow-teal-500/20"
                  style={{ backgroundColor: '#00a6a6' }}
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-2 text-gray-400 hover:text-gray-600 font-medium transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        ),
      });
    });
  });
};

const Home = lazyLoad(() => import('../pages/Home'));
const Rewards = lazyLoad(() => import('../pages/Rewards'));
const Account = lazyLoad(() => import('../pages/Account'));
const Native = lazyLoad(() => import('../pages/Native'));
const Cart = lazyLoad(() => import('../pages/Cart'));
const Checkout = lazyLoad(() => import('../pages/Checkout'));
const MyBookings = lazyLoad(() => import('../pages/MyBookings'));
const BookingDetails = lazyLoad(() => import('../pages/BookingDetails'));
const BookingTrack = lazyLoad(() => import('../pages/BookingTrack'));
const BookingConfirmation = lazyLoad(() => import('../pages/BookingConfirmation'));
const Settings = lazyLoad(() => import('../pages/Settings'));
const ManagePaymentMethods = lazyLoad(() => import('../pages/ManagePaymentMethods'));
const ManageAddresses = lazyLoad(() => import('../pages/ManageAddresses'));
const Wallet = lazyLoad(() => import('../pages/Wallet'));
const MyPlan = lazyLoad(() => import('../pages/MyPlan'));
const PlanDetails = lazyLoad(() => import('../pages/MyPlan/PlanDetails'));
const MyRating = lazyLoad(() => import('../pages/MyRating'));
const AboutHomestr = lazyLoad(() => import('../pages/AboutHomster'));
const UpdateProfile = lazyLoad(() => import('../pages/UpdateProfile'));
const Login = lazyLoad(() => import('../pages/login'));
const Signup = lazyLoad(() => import('../pages/signup'));
const Scrap = lazyLoad(() => import('../pages/Scrap'));
const AddScrap = lazyLoad(() => import('../pages/Scrap/AddScrap'));
const Notifications = lazyLoad(() => import('../pages/Notifications'));
const HelpSupport = lazyLoad(() => import('../pages/HelpSupport'));
const CancellationPolicy = lazyLoad(() => import('../pages/CancellationPolicy'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
  </div>
);

import { CartProvider } from '../../context/CartContext';
import { CityProvider } from '../../context/CityContext';
import LiveBookingCard from '../components/booking/LiveBookingCard';

const UserRoutes = () => {
  const location = useLocation();
  const path = location.pathname;

  const isPublicPage = path.includes('/login') || path.includes('/signup');
  // Bottom nav on every user page except auth screens
  const shouldShowBottomNav = path.startsWith('/sp/user') && !isPublicPage;

  const isBookingDetailsPage = /^\/sp\/user\/booking\/[^/]+(\/track)?$/.test(path);
  const isBookingConfirmationPage = path.includes('/booking-confirmation');
  const isHomePage = path === '/sp/user' || path === '/sp/user/';

  return (
    <CityProvider>
      <CartProvider>
        <ErrorBoundary>
          <div className={shouldShowBottomNav ? 'pb-24' : ''}>
            <Suspense fallback={<LoadingFallback />}>
              <PageTransition>
                <Routes>
                  <Route path="/login" element={<PublicRoute userType="user"><Login /></PublicRoute>} />
                  <Route path="/signup" element={<PublicRoute userType="user"><Signup /></PublicRoute>} />

                  <Route path="/" element={<ProtectedRoute userType="user"><Home /></ProtectedRoute>} />
                  <Route path="/native" element={<ProtectedRoute userType="user"><Native /></ProtectedRoute>} />

                  <Route path="/rewards" element={<ProtectedRoute userType="user"><Rewards /></ProtectedRoute>} />
                  <Route path="/account" element={<ProtectedRoute userType="user"><Account /></ProtectedRoute>} />
                  <Route path="/cart" element={<ProtectedRoute userType="user"><Cart /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute userType="user"><Checkout /></ProtectedRoute>} />
                  <Route path="/my-bookings" element={<ProtectedRoute userType="user"><MyBookings /></ProtectedRoute>} />
                  <Route path="/booking/:id" element={<ProtectedRoute userType="user"><BookingDetails /></ProtectedRoute>} />
                  <Route path="/booking/:id/track" element={<ProtectedRoute userType="user"><BookingTrack /></ProtectedRoute>} />
                  <Route path="/booking-confirmation/:id" element={<ProtectedRoute userType="user"><BookingConfirmation /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute userType="user"><Settings /></ProtectedRoute>} />
                  <Route path="/manage-payment-methods" element={<ProtectedRoute userType="user"><ManagePaymentMethods /></ProtectedRoute>} />
                  <Route path="/manage-addresses" element={<ProtectedRoute userType="user"><ManageAddresses /></ProtectedRoute>} />
                  <Route path="/wallet" element={<ProtectedRoute userType="user"><Wallet /></ProtectedRoute>} />
                  <Route path="/my-plan" element={<ProtectedRoute userType="user"><MyPlan /></ProtectedRoute>} />
                  <Route path="/my-plan/:id" element={<ProtectedRoute userType="user"><PlanDetails /></ProtectedRoute>} />
                  <Route path="/my-rating" element={<ProtectedRoute userType="user"><MyRating /></ProtectedRoute>} />
                  <Route path="/about-homestr" element={<ProtectedRoute userType="user"><AboutHomestr /></ProtectedRoute>} />
                  <Route path="/update-profile" element={<ProtectedRoute userType="user"><UpdateProfile /></ProtectedRoute>} />
                  <Route path="/scrap" element={<ProtectedRoute userType="user"><Scrap /></ProtectedRoute>} />
                  <Route path="/scrap/add" element={<ProtectedRoute userType="user"><AddScrap /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute userType="user"><Notifications /></ProtectedRoute>} />
                  <Route path="/help-support" element={<ProtectedRoute userType="user"><HelpSupport /></ProtectedRoute>} />
                  <Route path="/cancellation-policy" element={<ProtectedRoute userType="user"><CancellationPolicy /></ProtectedRoute>} />
                </Routes>
              </PageTransition>
            </Suspense>
          </div>

          {!isBookingDetailsPage && !isBookingConfirmationPage && !isPublicPage && (
            <LiveBookingCard hasBottomNav={shouldShowBottomNav} />
          )}
          {shouldShowBottomNav && <BottomNav />}
        </ErrorBoundary>
      </CartProvider>
    </CityProvider>
  );
};

export default UserRoutes;
