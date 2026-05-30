import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load module routes
const UserRoutes = lazy(() => import('../user/routes'));
const VendorRoutes = lazy(() => import('../vendor/routes'));
const WorkerRoutes = lazy(() => import('../worker/routes'));
const AdminRoutes = lazy(() => import('../admin/routes'));
const LandingPage = lazy(() => import('../landing/pages/LandingPage'));

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center font-outfit">
    Loading...
  </div>
);

const SPRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Landing Page */}
        <Route path="/home" element={<LandingPage />} />

        {/* Redirect root to user app */}
        <Route path="/" element={<Navigate to="/sp/user" replace />} />

        {/* User Routes */}
        <Route path="/user/*" element={<UserRoutes />} />

        {/* Vendor Routes */}
        <Route path="/vendor/*" element={<VendorRoutes />} />

        {/* Worker Routes */}
        <Route path="/worker/*" element={<WorkerRoutes />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/sp/user" replace />} />
      </Routes>
    </Suspense>
  );
};

export default SPRoutes;
