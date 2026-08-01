import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import UserRoutes from '../user/routes';
import VendorRoutes from '../vendor/routes';
import WorkerRoutes from '../worker/routes';
import AdminRoutes from '../admin/routes';
import LandingPage from '../landing/pages/LandingPage';

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center font-outfit">
    Loading...
  </div>
);

const SPRoutes = () => {
  return (
    <div className="font-roboto">
      <Toaster position="top-right" />
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
    </div>
  );
};

export default SPRoutes;
