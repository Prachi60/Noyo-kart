import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@shared/layout/DashboardLayout";
import Orders from "../pages/Orders";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "@core/context/AuthContext";
import { getOrderSocket, onSellerOrderNew } from "@/core/services/orderSocket";
import {
  HiOutlineSquares2X2,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineUser,
  HiOutlineTruck,
  HiOutlineArchiveBox,
  HiOutlineChartBarSquare,
  HiOutlineCreditCard,
  HiOutlineMapPin,
} from "react-icons/hi2";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const ProductManagement = React.lazy(
  () => import("../pages/ProductManagement"),
);
const StockManagement = React.lazy(() => import("../pages/StockManagement"));
const AddProduct = React.lazy(() => import("../pages/AddProduct"));
// Note: Orders is imported eagerly above to avoid dynamic import issues
const Returns = React.lazy(() => import("../pages/Returns"));
const Earnings = React.lazy(() => import("../pages/Earnings"));
const Analytics = React.lazy(() => import("../pages/Analytics"));
const Transactions = React.lazy(() => import("../pages/Transactions"));
const DeliveryTracking = React.lazy(() => import("../pages/DeliveryTracking"));
const Profile = React.lazy(() => import("../pages/Profile"));
const Withdrawals = React.lazy(() => import("../pages/Withdrawals"));

const navItems = [
  { label: "Dashboard", path: "/seller", icon: HiOutlineSquares2X2, end: true },
  { label: "Products", path: "/seller/products", icon: HiOutlineCube },
  { label: "Stock", path: "/seller/inventory", icon: HiOutlineArchiveBox },
  { label: "Orders", path: "/seller/orders", icon: HiOutlineTruck },
  { label: "Returns", path: "/seller/returns", icon: HiOutlineArchiveBox },
  { label: "Track Orders", path: "/seller/tracking", icon: HiOutlineMapPin },
  {
    label: "Sales Reports",
    path: "/seller/analytics",
    icon: HiOutlineChartBarSquare,
  },
  {
    label: "Money Request",
    path: "/seller/withdrawals",
    icon: HiOutlineCurrencyDollar,
  },
  {
    label: "Payment History",
    path: "/seller/transactions",
    icon: HiOutlineCreditCard,
  },
  {
    label: "Earnings",
    path: "/seller/earnings",
    icon: HiOutlineCurrencyDollar,
  },
  { label: "Profile", path: "/seller/profile", icon: HiOutlineUser },
];

const SellerRoutes = () => {
  const { user } = useAuth();
  const [newOrder, setNewOrder] = React.useState(null);

  // Connect socket and listen for new orders
  React.useEffect(() => {
    const getToken = () => localStorage.getItem("auth_seller");
    getOrderSocket(getToken);
    const unsub = onSellerOrderNew(getToken, (payload) => {
      const audio = new Audio("/sound.mp3");
      audio.play().catch(() => {});
      const order = {
        orderId: payload?.orderId || payload?.id || "New Order",
        customerName: payload?.customerName || payload?.customer?.name || "Customer",
        total: payload?.total || payload?.pricing?.total || 0,
      };
      setNewOrder(order);
      // Auto-dismiss after 8s
      setTimeout(() => setNewOrder((cur) => cur?.orderId === order.orderId ? null : cur), 8000);
    });
    return unsub;
  }, [user]);

  return (
    <>
      {/* Global new order alert popup — portaled above everything */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {newOrder && (
              <motion.div
                key={newOrder.orderId}
                initial={{ opacity: 0, y: -60, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-sm px-4"
              >
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                  {/* Top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-primary" />
                  <div className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 animate-bounce">
                      <ShoppingBag className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">New Order</p>
                      <p className="text-sm font-black text-slate-900 truncate">#{newOrder.orderId}</p>
                      <p className="text-xs font-semibold text-slate-500 truncate">
                        {newOrder.customerName}
                        {newOrder.total > 0 && ` · ₹${newOrder.total}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setNewOrder(null)}
                      className="shrink-0 text-xs font-black text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <DashboardLayout navItems={navItems} title="Seller Panel">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/products/add" element={<AddProduct />} />
          <Route path="/inventory" element={<StockManagement />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/tracking" element={<DeliveryTracking />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </>
  );
};

export default SellerRoutes;
