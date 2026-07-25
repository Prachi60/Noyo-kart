import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiUsers,
  FiBriefcase,
  FiUser,
  FiShoppingBag,
  FiGrid,
  FiDollarSign,
  FiFileText,
  FiBell,
  FiSettings,
  FiChevronDown,
  FiX,
  FiPackage,
  FiTrash2,
  FiStar,
} from "react-icons/fi";
import dashboardService from "../../services/dashboardService";
import { configService } from "../../../services/configService";

// Icon mapping for menu items
const iconMap = {
  Dashboard: FiHome,
  Users: FiUsers,
  Vendors: FiBriefcase,
  Workers: FiUser,
  Bookings: FiShoppingBag,
  "User Catalog": FiGrid,
  "Vendor Services": FiGrid,
  "Vendor Parts": FiPackage,
  Payments: FiDollarSign,
  Reports: FiFileText,
  Notifications: FiBell,
  "Scrap Items": FiTrash2,
  Reviews: FiStar,
  Settlements: FiDollarSign,
  Settings: FiSettings,
  Plans: FiPackage,
};

// Helper function to convert child name to route path
const getChildRoute = (parentRoute, childName) => {
  const routeMap = {
    "/sp/admin/users": {
      "All Users": "/sp/admin/users/all",
      "User Bookings": "/sp/admin/users/bookings",
      "Transactions": "/sp/admin/users/transactions",
      "User Analytics": "/sp/admin/users/analytics",
    },
    "/sp/admin/vendors": {
      "All Vendors": "/sp/admin/vendors/all",
      "Vendor Bookings": "/sp/admin/vendors/bookings",
      "Vendor Analytics": "/sp/admin/vendors/analytics",
      "Vendor Payments": "/sp/admin/vendors/payments",
    },
    "/sp/admin/workers": {
      "All Workers": "/sp/admin/workers/all",
      "Worker Jobs": "/sp/admin/workers/jobs",
      "Worker Analytics": "/sp/admin/workers/analytics",
      "Worker Payments": "/sp/admin/workers/payments",
    },
    "/sp/admin/bookings": {
      "All Bookings": "/sp/admin/bookings",
      "Booking Tracking": "/sp/admin/bookings/tracking",
      "Booking Notifications": "/sp/admin/bookings/notifications",
    },
    "/sp/admin/user-categories": {
      "Home": "/sp/admin/user-categories/home",
      "Manage Categories": "/sp/admin/user-categories/categories",
      "Manage Brands": "/sp/admin/user-categories/brands",
      "Manage Services": "/sp/admin/user-categories/sections",
    },
    "/sp/admin/payments": {
      "Payment Overview": "/sp/admin/payments/overview",
      "User Payments": "/sp/admin/payments/users",
      "Worker Payments": "/sp/admin/payments/workers",
      "Vendor Payments": "/sp/admin/payments/vendors",
      "Admin Revenue": "/sp/admin/payments/revenue",
      "Payment Reports": "/sp/admin/payments/reports",
    },
    "/sp/admin/reports": {
      "Revenue Report": "/sp/admin/reports/revenue",
      "Booking Report": "/sp/admin/reports/bookings",
      "Payment Report": "/sp/admin/payments/reports",
    },
    "/sp/admin/notifications": {
      "Push Notifications": "/sp/admin/notifications/push",
      "Custom Messages": "/sp/admin/notifications/messages",
      "Notification Settings": "/sp/admin/notifications/settings",
    },
    "/sp/admin/settings": {
      "General Settings": "/sp/admin/settings/general",
      "Worker Assignment": "/sp/admin/settings/worker-assignment",
      "Service Configuration": "/sp/admin/settings/service-config",
      "System Settings": "/sp/admin/settings/system",
    },
    "/sp/admin/settlements": {
      "Pending": "/sp/admin/settlements/pending",
      "Withdrawals": "/sp/admin/settlements/withdrawals",
      "Vendors with Due": "/sp/admin/settlements/vendors",
      "History": "/sp/admin/settlements/history",
    },
  };

  return routeMap[parentRoute]?.[childName] || parentRoute;
};

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [adminUser, setAdminUser] = useState({ name: 'Admin', email: '', role: 'admin' });
  const [counts, setCounts] = useState({
    bookings: 0,
    vendors: 0,
    withdrawals: 0,
    pendingSettlements: 0,
    scraps: 0
  });

  // Load admin user from storage
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('spAdminData') || localStorage.getItem('spAdminData');
      const stored = JSON.parse(storedData || '{}');
      if (stored.name || stored.email) {
        setAdminUser({
          name: stored.name || 'Admin',
          email: stored.email || '',
          role: stored.role || 'admin'
        });
      }
    } catch (e) {
      console.error('Failed to parse admin data:', e);
    }
  }, []);

  const [dynamicMenu, setDynamicMenu] = useState([]);

  // Fallback default menu in case the DB doesn't have it initialized
  const defaultAdminMenu = [
    { title: 'Dashboard', route: '/sp/admin/dashboard', allowedRoles: ['super_admin', 'admin'], children: [] },
    { title: 'Users', route: '/sp/admin/users', allowedRoles: ['super_admin', 'admin'], children: ['All Users', 'User Bookings', 'User Analytics'] },
    { title: 'Vendors', route: '/sp/admin/vendors', allowedRoles: ['super_admin', 'admin'], children: ['All Vendors', 'Vendor Bookings', 'Vendor Analytics'] },
    { title: 'Workers', route: '/sp/admin/workers', allowedRoles: ['super_admin', 'admin'], children: ['All Workers', 'Worker Jobs', 'Worker Analytics'] },
    { title: 'Bookings', route: '/sp/admin/bookings', allowedRoles: ['super_admin', 'admin'], children: ['All Bookings', 'Booking Tracking', 'Booking Notifications'] },
    { title: 'Scrap Items', route: '/sp/admin/scrap', allowedRoles: ['super_admin', 'admin'], children: [] },
    { title: 'Payments', route: '/sp/admin/payments', allowedRoles: ['super_admin'], children: ['Payment Overview', 'User Payments', 'Worker Payments', 'Vendor Payments', 'Admin Revenue', 'Payment Reports'] },
    { title: 'Settlements', route: '/sp/admin/settlements', allowedRoles: ['super_admin'], children: ['Pending', 'Withdrawals', 'Vendors with Due', 'History'] },
    { title: 'User Catalog', route: '/sp/admin/user-categories', allowedRoles: ['super_admin', 'admin'], children: ['Home', 'Manage Categories', 'Manage Brands', 'Manage Services'] },
    { title: 'Vendor Services', route: '/sp/admin/user-categories/vendor-services', allowedRoles: ['super_admin', 'admin'], children: [] },
    { title: 'Vendor Parts', route: '/sp/admin/user-categories/vendor-parts', allowedRoles: ['super_admin', 'admin'], children: [] },
    { title: 'Reports', route: '/sp/admin/reports', allowedRoles: ['super_admin'], children: ['Revenue Report', 'Booking Report', 'Payment Report'] },
    { title: 'Reviews', route: '/sp/admin/reviews', allowedRoles: ['super_admin'], children: [] },
    { title: 'Plans', route: '/sp/admin/plans', allowedRoles: ['super_admin'], children: [] },
    { title: 'Settings', route: '/sp/admin/settings', allowedRoles: ['super_admin', 'admin'], children: [] }
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await configService.getSettings();
        if (res.success && res.settings && res.settings.adminSidebarMenus && res.settings.adminSidebarMenus.length > 0) {
          setDynamicMenu(res.settings.adminSidebarMenus);
        } else {
          setDynamicMenu(defaultAdminMenu);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Filter menu items by role
  const filteredMenu = useMemo(() => dynamicMenu.filter(item => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    return item.allowedRoles.includes(adminUser.role);
  }), [adminUser.role, dynamicMenu]);

  // Fetch pending counts for badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await dashboardService.getStats();
        if (response.success && response.data?.stats) {
          const stats = response.data.stats;
          setCounts({
            bookings: stats.pendingBookings || 0,
            vendors: stats.pendingVendors || 0,
            withdrawals: stats.pendingWithdrawals || 0,
            pendingSettlements: stats.pendingSettlements || 0,
            scraps: stats.pendingScraps || 0
          });
        }
      } catch (error) {
        console.error("Error fetching sidebar counts:", error);
      }
    };

    fetchCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-close sidebar on mobile when route changes
  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    // Only close if screen is small (mobile)
    if (window.innerWidth < 1024) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Remove onClose to prevent re-triggering when parent re-renders

  // Auto-expand menu items when their route is active
  useEffect(() => {
    const activeItem = filteredMenu.find((item) => {
      if (item.route === "/sp/admin/dashboard") {
        return location.pathname === "/sp/admin/dashboard";
      }
      const isChildRoute =
        location.pathname.startsWith(item.route) &&
        location.pathname !== item.route;
      return isChildRoute;
    });
    if (activeItem && activeItem.children && activeItem.children.length > 0) {
      setExpandedItems((prev) => {
        if (prev[activeItem.title]) {
          return prev;
        }
        return {
          [activeItem.title]: true,
        };
      });
    }
  }, [location.pathname, filteredMenu]);

  // Check if a menu item is active
  const isActive = (route) => {
    if (route === "/sp/admin/dashboard") {
      return location.pathname === "/sp/admin/dashboard";
    }

    // Special case for User Catalog to avoid overlap with Vendor Services/Parts
    if (route === "/sp/admin/user-categories") {
      if (location.pathname.startsWith("/sp/admin/user-categories/vendor-")) {
        return false;
      }
    }

    // Strict prefix check: either exact match OR followed by a slash
    return location.pathname === route || location.pathname.startsWith(route + '/');
  };

  // Toggle expanded state for menu items with children
  const toggleExpand = (title, closeOthers = true) => {
    setExpandedItems((prev) => {
      if (closeOthers) {
        return {
          [title]: !prev[title],
        };
      } else {
        return {
          ...prev,
          [title]: !prev[title],
        };
      }
    });
  };

  // Handle menu item click
  const handleMenuItemClick = (route, parentTitle = null) => {
    if (parentTitle) {
      setExpandedItems((prev) => {
        return {
          [parentTitle]: true,
        };
      });
    }
    navigate(route);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Render menu item
  const renderMenuItem = (item) => {
    const Icon = iconMap[item.title] || FiHome;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.title];
    const active = isActive(item.route);

    return (
      <div key={item.route} className="mb-1">
        {/* Main Menu Item */}
        <div
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer
            ${active
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-slate-700"
            }
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.title, true);
            } else {
              handleMenuItemClick(item.route);
            }
          }}>
          <Icon
            className={`text-xl flex-shrink-0 ${active ? "text-white" : "text-gray-400"
              }`}
          />
          <span className="font-semibold flex-1 text-base">{item.title}</span>

          {/* Badge Display */}
          {item.title === "Bookings" && counts.bookings > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-2">
              {counts.bookings > 99 ? '99+' : counts.bookings}
            </span>
          )}
          {item.title === "Vendors" && counts.vendors > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-2">
              {counts.vendors > 99 ? '99+' : counts.vendors}
            </span>
          )}
          {item.title === "Settlements" && (counts.withdrawals + counts.pendingSettlements) > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-2">
              {(counts.withdrawals + counts.pendingSettlements) > 99 ? '99+' : (counts.withdrawals + counts.pendingSettlements)}
            </span>
          )}
          {item.title === "Scrap Items" && counts.scraps > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-2">
              {counts.scraps > 99 ? '99+' : counts.scraps}
            </span>
          )}

          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}>
              <FiChevronDown className="text-gray-400 text-sm" />
            </motion.div>
          )}
        </div>

        {/* Children Items */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-600 space-y-1">
                {item.children.map((child, index) => {
                  const childRoute = getChildRoute(item.route, child);
                  const isChildActive =
                    location.pathname === childRoute ||
                    (childRoute !== item.route &&
                      location.pathname.startsWith(childRoute));

                  return (
                    <div
                      key={index}
                      onClick={() =>
                        handleMenuItemClick(childRoute, item.title)
                      }
                      className={`
                        px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer flex justify-between items-center
                        ${isChildActive
                          ? "bg-primary-50 text-white font-medium"
                          : "text-gray-400 hover:bg-slate-700"
                        }
                      `}>
                      <span>{child}</span>
                      {item.title === "Settlements" && child === "Pending" && counts.pendingSettlements > 0 && (
                        <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full">
                          {counts.pendingSettlements}
                        </span>
                      )}
                      {item.title === "Settlements" && child === "Withdrawals" && counts.withdrawals > 0 && (
                        <span className="bg-orange-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full">
                          {counts.withdrawals}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Sidebar content
  const sidebarContent = (
    <div className="h-full w-full flex flex-col bg-slate-800 overflow-hidden">
      {/* Header Section */}
      <div className="px-4 py-6 border-b border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #2874F0 0%, #4787F7 100%)',
              }}
            >
              <FiUser className="text-white text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white text-base truncate">
                {adminUser.name}
              </h2>
              <p className="text-xs text-gray-400 truncate">
                {adminUser.role === 'super_admin' ? '⭐ Super Admin' : 'Admin'}
              </p>
            </div>
          </div>

          {/* Close Button - Mobile Only */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 lg:hidden"
            aria-label="Close sidebar">
            <FiX className="text-xl text-gray-300" />
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-admin lg:pb-3">
        {filteredMenu.map((item) => renderMenuItem(item))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile: Overlay Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[99998] lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-[99999] lg:hidden shadow-2xl"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop Fixed */}
      <div
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30"
        style={{ width: '278px' }}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default AdminSidebar;

