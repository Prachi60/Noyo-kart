import mongoose from 'mongoose';
import serviceDb from '../config/db.js';

const spSettingsSchema = new mongoose.Schema({
  type: { type: String, default: 'global', unique: true },
  visitedCharges: { type: Number, default: 0, min: 0 },
  serviceGstPercentage: { type: Number, default: 18, min: 0, max: 100 },
  partsGstPercentage: { type: Number, default: 18, min: 0, max: 100 },
  servicePayoutPercentage: { type: Number, default: 90, min: 0, max: 100 },
  partsPayoutPercentage: { type: Number, default: 100, min: 0, max: 100 },
  tdsPercentage: { type: Number, default: 1, min: 0, max: 100 },
  platformFeePercentage: { type: Number, default: 1, min: 0, max: 100 },
  vendorCashLimit: { type: Number, default: 10000, min: 0 },
  cancellationPenalty: { type: Number, default: 49, min: 0 },
  maxSearchTime: { type: Number, default: 5, min: 1 },
  waveDuration: { type: Number, default: 60, min: 10 },
  searchRadius: { type: Number, default: 10, min: 1 },
  razorpayKeyId: { type: String, default: null },
  razorpayKeySecret: { type: String, default: null },
  razorpayWebhookSecret: { type: String, default: null },
  currency: { type: String, default: 'INR' },
  companyName: { type: String, default: 'Noyo Services' },
  companyGSTIN: { type: String, default: '' },
  companyPAN: { type: String, default: '' },
  companyAddress: { type: String, default: '' },
  companyCity: { type: String, default: '' },
  companyState: { type: String, default: '' },
  companyPincode: { type: String, default: '' },
  companyPhone: { type: String, default: '' },
  companyEmail: { type: String, default: '' },
  invoicePrefix: { type: String, default: 'INV' },
  sacCode: { type: String, default: '998599' },
  currentInvoiceNumber: { type: Number, default: 0 },
  supportEmail: { type: String, default: '' },
  supportPhone: { type: String, default: '' },
  supportWhatsapp: { type: String, default: '' },
  isOnlinePaymentEnabled: { type: Boolean, default: true },

  // Dynamic Landing Page Join Us Section
  landingJoinUs: {
    isVisible: { type: Boolean, default: true },
    cards: {
      type: [{
        title: { type: String, default: "" },
        icon: { type: String, default: "" },
        btn: { type: String, default: "" },
        to: { type: String, default: "" }
      }],
      default: [
        { to: "/sp/user", icon: "FaUser", title: "As a User", btn: "Book Service" },
        { to: "/sp/vendor/login", icon: "FaStore", title: "Vendor Partner", btn: "Partner Now" },
        { to: "/sp/worker/login", icon: "FaHammer", title: "As an Xpert", btn: "Start Earning" }
      ]
    }
  },

  // Dynamic FAQ Categories
  faqCategories: {
    type: [{
      id: { type: String, default: "" },
      title: { type: String, default: "" },
      icon: { type: String, default: "" },
      color: { type: String, default: "" },
      questions: [{
        q: { type: String, default: "" },
        a: { type: String, default: "" }
      }]
    }],
    default: [
      {
        id: 'booking',
        title: 'Booking & Services',
        icon: 'FiBook',
        color: '#3B82F6',
        questions: [
          { q: 'How do I book a service?', a: 'Navigate to the home page, select your desired service category, choose a service provider, select time slot, and confirm booking.' },
          { q: 'Can I cancel or reschedule my booking?', a: 'Yes, you can cancel or reschedule your booking from the My Bookings page up to 2 hours before the scheduled time.' },
          { q: 'What payment methods are accepted?', a: 'We accept all major payment methods including UPI, Credit/Debit cards, Net Banking, and Wallets.' }
        ]
      },
      {
        id: 'payment',
        title: 'Payments & Wallet',
        icon: 'FiClock',
        color: '#10B981',
        questions: [
          { q: 'How do I add money to my wallet?', a: 'Go to Wallet page, click on "Add Money", enter amount, and complete the payment using your preferred method.' },
          { q: 'Is my payment information secure?', a: 'Yes, we use industry-standard encryption and never store your complete card details on our servers.' },
          { q: 'How long does refund take?', a: 'Refunds are processed within 5-7 business days and will be credited to your original payment method or wallet.' }
        ]
      },
      {
        id: 'account',
        title: 'Account & Profile',
        icon: 'FiAlertCircle',
        color: '#F59E0B',
        questions: [
          { q: 'How do I update my profile?', a: 'Go to Account page, tap on the edit icon next to your name, update your details, and save changes.' },
          { q: 'How do I change my phone number?', a: 'Phone number can be changed from Settings > Update Phone Number. OTP verification will be required.' },
          { q: 'Can I delete my account?', a: 'Yes, you can request account deletion from Settings > Account Management > Delete Account.' }
        ]
      }
    ]
  },

  // Account Page Dynamic Settings
  appVersion: { type: String, default: "Version 7.6.27 R547" },
  aboutAppName: { type: String, default: "About Truliq" },
  accountMenus: {
    type: [{
      group: { type: String, default: "" },
      items: [{
        label: { type: String, default: "" },
        icon: { type: String, default: "" },
        path: { type: String, default: "" }
      }]
    }],
    default: [
      {
        group: "Shopping",
        items: [
          { label: "Scrap Deals", icon: "FiShoppingBag", path: "/user/scrap" },
          { label: "My Plans", icon: "FiFileText", path: "/user/my-plan" }
        ]
      },
      {
        group: "Activity",
        items: [
          { label: "My Bookings", icon: "FiClipboard", path: "/user/my-bookings" },
          { label: "My Ratings", icon: "FiStar", path: "/user/my-rating" }
        ]
      },
      {
        group: "Preferences",
        items: [
          { label: "Manage Addresses", icon: "FiMapPin", path: "/user/manage-addresses" },
          { label: "Settings", icon: "FiSettings", path: "/user/settings" }
        ]
      }
    ]
  },

  aboutUs: {
    heroDescription: { type: String, default: "Your trusted partner for premium home and personal care services." },
    missionTitle: { type: String, default: "Our Mission" },
    missionDescription: { type: String, default: "Truliq is dedicated to revolutionizing how you experience home services. We connect you with top-tier professionals to deliver safe, reliable, and high-quality services right at your doorstep. We believe in making life simpler, one service at a time." },
    stats: {
      type: [{ number: { type: String }, label: { type: String } }],
      default: [
        { number: '10K+', label: 'Happy Customers' },
        { number: '500+', label: 'Service Partners' },
        { number: '4.8', label: 'App Rating' }
      ]
    },
    features: {
      type: [{ icon: { type: String }, title: { type: String }, description: { type: String } }],
      default: [
        { icon: 'FiUsers', title: 'Expert Providers', description: 'Verified professionals for all your needs' },
        { icon: 'FiShield', title: 'Safe & Secure', description: 'Your safety is our top priority' },
        { icon: 'FiClock', title: 'On-Time Service', description: 'Punctual delivery at your convenience' },
        { icon: 'FiAward', title: 'Quality Assured', description: 'Service with 100% satisfaction guarantee' }
      ]
    },
    howWeWork: {
      type: [{ title: { type: String }, desc: { type: String }, icon: { type: String } }],
      default: [
        { title: 'Book Details', desc: 'Select service & schedule time', icon: 'FiSmartphone' },
        { title: 'Get Matched', desc: 'We assign a top-rated pro', icon: 'FiUsers' },
        { title: 'Relax', desc: 'Enjoy high-quality service', icon: 'FiSmile' }
      ]
    }
  },
  
  cancellationPolicyText: {
    type: String,
    default: "Our service partners reserve their time exclusively for your booking and may travel significant distances. The cancellation fee compensates them for their lost time and travel expenses if a confirmed booking is cancelled last minute."
  },

  bottomNavigation: {
    type: [{
      id: { type: String },
      label: { type: String },
      icon: { type: String },
      filledIcon: { type: String },
      path: { type: String },
      isCart: { type: Boolean, default: false }
    }],
    default: [
      { id: 'home', label: 'Home', icon: 'FiHome', filledIcon: 'HiHome', path: '/user' },
      { id: 'bookings', label: 'Bookings', icon: 'FiCalendar', filledIcon: 'HiCalendar', path: '/user/my-bookings' },
      { id: 'scrap', label: 'Scrap', icon: 'FiTrash2', filledIcon: 'HiTrash', path: '/user/scrap' },
      { id: 'cart', label: 'Cart', icon: 'FiShoppingCart', filledIcon: 'HiShoppingCart', path: '/user/cart', isCart: true },
      { id: 'account', label: 'Account', icon: 'FiUser', filledIcon: 'HiUser', path: '/user/account' }
    ]
  },

  vendorBottomNavigation: {
    type: [{
      id: { type: String },
      label: { type: String },
      icon: { type: String },
      activeIcon: { type: String },
      path: { type: String }
    }],
    default: [
      { id: 'home', label: 'Home', icon: 'FiHome', activeIcon: 'HiHome', path: '/sp/vendor/dashboard' },
      { id: 'jobs', label: 'Jobs', icon: 'FiBriefcase', activeIcon: 'HiBriefcase', path: '/sp/vendor/jobs' },
      { id: 'workers', label: 'Workers', icon: 'FiUsers', activeIcon: 'HiUsers', path: '/sp/vendor/workers' },
      { id: 'wallet', label: 'Wallet', icon: 'FaWallet', activeIcon: 'FaWallet', path: '/sp/vendor/wallet' },
      { id: 'profile', label: 'Profile', icon: 'FiUser', activeIcon: 'HiUser', path: '/sp/vendor/profile' }
    ]
  },

  vendorAccountMenus: {
    type: [{
      id: { type: Number },
      label: { type: String },
      icon: { type: String },
      customIcon: { type: String, default: null },
      path: { type: String }
    }],
    default: [
      { id: 2, label: 'Wallet', icon: 'FaWallet', path: '/sp/vendor/wallet' },
      { id: 5, label: 'My Ratings', icon: 'FiStar', path: '/sp/vendor/my-ratings' },
      { id: 6, label: 'Manage Payment Methods', icon: 'FiCreditCard', path: '/sp/vendor/manage-payment-methods' },
      { id: 7, label: 'Manage Address', icon: 'FiMapPin', path: '/sp/vendor/address-management' },
      { id: 8, label: 'Settings', icon: 'FiSettings', path: '/sp/vendor/settings' },
      { id: 9, label: 'About Truliq', customIcon: 'T', path: '/sp/vendor/about-truliq' }
    ]
  },

  workerBottomNavigation: {
    type: [{
      id: { type: String },
      label: { type: String },
      icon: { type: String },
      activeIcon: { type: String },
      path: { type: String }
    }],
    default: [
      { id: 'home', label: 'Home', icon: 'FiHome', activeIcon: 'HiHome', path: '/sp/worker/dashboard' },
      { id: 'jobs', label: 'My Jobs', icon: 'FiBriefcase', activeIcon: 'HiBriefcase', path: '/sp/worker/jobs' },
      { id: 'earnings', label: 'Earnings', icon: 'FaWallet', activeIcon: 'FaWallet', path: '/sp/worker/earnings' },
      { id: 'profile', label: 'Profile', icon: 'FiUser', activeIcon: 'HiUser', path: '/sp/worker/profile' }
    ]
  },

  adminSidebarMenus: {
    type: [{
      title: { type: String },
      route: { type: String },
      allowedRoles: [{ type: String }],
      children: [{ type: String }]
    }],
    default: [
      {
        title: 'Dashboard',
        route: '/sp/admin/dashboard',
        allowedRoles: ['super_admin', 'admin'],
        children: []
      },
      {
        title: 'Users',
        route: '/sp/admin/users',
        allowedRoles: ['super_admin', 'admin'],
        children: ['All Users', 'User Bookings', 'User Analytics']
      },
      {
        title: 'Vendors',
        route: '/sp/admin/vendors',
        allowedRoles: ['super_admin', 'admin'],
        children: ['All Vendors', 'Vendor Bookings', 'Vendor Analytics']
      },
      {
        title: 'Workers',
        route: '/sp/admin/workers',
        allowedRoles: ['super_admin', 'admin'],
        children: ['All Workers', 'Worker Jobs', 'Worker Analytics']
      },
      {
        title: 'Bookings',
        route: '/sp/admin/bookings',
        allowedRoles: ['super_admin', 'admin'],
        children: ['All Bookings', 'Booking Tracking', 'Booking Notifications']
      },
      {
        title: 'Scrap Items',
        route: '/sp/admin/scrap',
        allowedRoles: ['super_admin', 'admin'],
        children: []
      },
      {
        title: 'Payments',
        route: '/sp/admin/payments',
        allowedRoles: ['super_admin'],
        children: ['Payment Overview', 'User Payments', 'Worker Payments', 'Vendor Payments', 'Admin Revenue', 'Payment Reports']
      },
      {
        title: 'Settlements',
        route: '/sp/admin/settlements',
        allowedRoles: ['super_admin'],
        children: ['Pending', 'Withdrawals', 'Vendors with Due', 'History']
      },
      {
        title: 'User Catalog',
        route: '/sp/admin/user-categories',
        allowedRoles: ['super_admin', 'admin'],
        children: ['Home', 'Manage Categories', 'Manage Brands', 'Manage Services']
      },
      {
        title: 'Vendor Services',
        route: '/sp/admin/user-categories/vendor-services',
        allowedRoles: ['super_admin', 'admin'],
        children: []
      },
      {
        title: 'Vendor Parts',
        route: '/sp/admin/user-categories/vendor-parts',
        allowedRoles: ['super_admin', 'admin'],
        children: []
      },
      {
        title: 'Reports',
        route: '/sp/admin/reports',
        allowedRoles: ['super_admin'],
        children: ['Revenue Report', 'Booking Report', 'Payment Report']
      },
      {
        title: 'Reviews',
        route: '/sp/admin/reviews',
        allowedRoles: ['super_admin'],
        children: []
      },
      {
        title: 'Plans',
        route: '/sp/admin/plans',
        allowedRoles: ['super_admin'],
        children: []
      },
      {
        title: 'Settings',
        route: '/sp/admin/settings',
        allowedRoles: ['super_admin', 'admin'],
        children: []
      }
    ]
  },

  adminBottomNavigation: {
    type: [{
      id: { type: String },
      label: { type: String },
      icon: { type: String },
      path: { type: String }
    }],
    default: [
      { id: 'dashboard', label: 'Home', icon: 'FiHome', path: '/sp/admin/dashboard' },
      { id: 'users', label: 'Users', icon: 'FiUsers', path: '/sp/admin/users' },
      { id: 'bookings', label: 'Bookings', icon: 'FiShoppingBag', path: '/sp/admin/bookings' },
      { id: 'settings', label: 'Settings', icon: 'FiSettings', path: '/sp/admin/settings' }
    ]
  }
}, { timestamps: true });

export default serviceDb.model('SpSettings', spSettingsSchema, 'settings');
