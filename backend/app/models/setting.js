import mongoose from "mongoose";
import {
    ALL_DELIVERY_PRICING_MODES,
    ALL_HANDLING_FEE_STRATEGIES,
} from "../constants/finance.js";

const settingSchema = new mongoose.Schema(
    {
        // General
        appName: {
            type: String,
            default: "Appzeto Quick Commerce",
        },
        supportEmail: {
            type: String,
            default: "support@appzeto.com",
        },
        supportPhone: {
            type: String,
            default: "",
        },
        currencySymbol: {
            type: String,
            default: "₹",
        },
        currencyCode: {
            type: String,
            default: "INR",
        },
        timezone: {
            type: String,
            default: "Asia/Kolkata",
        },

        // Branding
        logoUrl: String,
        faviconUrl: String,
        primaryColor: {
            type: String,
            default: "#0ea5e9",
        },
        secondaryColor: {
            type: String,
            default: "#64748b",
        },

        // Legal
        companyName: String,
        taxId: String,
        address: String,

        // Social
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String,
        youtube: String,

        // Apps
        playStoreLink: String,
        appStoreLink: String,

        // SEO
        metaTitle: String,
        metaDescription: String,
        metaKeywords: String,
        keywords: [{ type: String }], // Array for structured SEO keywords

        // Optional: multi-tenant (null = default tenant)
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },

        // Returns / logistics configuration
        returnDeliveryCommission: {
            // Flat amount per return pickup, paid by seller
            type: Number,
            default: 0,
        },

        /**
         * Finance / delivery pricing rules (single source of truth).
         * Existing keys are kept for backward compatibility.
         */
        deliveryPricingMode: {
            type: String,
            enum: ALL_DELIVERY_PRICING_MODES,
            default: "distance_based",
        },
        pricingMode: {
            type: String,
            enum: ALL_DELIVERY_PRICING_MODES,
            default: "distance_based",
        },
        customerBaseDeliveryFee: {
            type: Number,
            default: 30,
            min: 0,
        },
        riderBasePayout: {
            type: Number,
            default: 30,
            min: 0,
        },
        baseDeliveryCharge: {
            type: Number,
            default: 30,
            min: 0,
        },
        baseDistanceCapacityKm: {
            type: Number,
            default: 0.5,
            min: 0,
        },
        incrementalKmSurcharge: {
            type: Number,
            default: 10,
            min: 0,
        },
        deliveryPartnerRatePerKm: {
            type: Number,
            default: 5,
            min: 0,
        },
        fleetCommissionRatePerKm: {
            type: Number,
            default: 5,
            min: 0,
        },
        fixedDeliveryFee: {
            type: Number,
            default: 30,
            min: 0,
        },
        handlingFeeStrategy: {
            type: String,
            enum: ALL_HANDLING_FEE_STRATEGIES,
            default: "highest_category_fee",
        },
        codEnabled: {
            type: Boolean,
            default: true,
        },
        onlineEnabled: {
            type: Boolean,
            default: true,
        },

        // --- Ecommerce Dynamic Menus ---

        customerBottomNav: {
            type: [{
                label: { type: String },
                icon: { type: String },
                path: { type: String }
            }],
            default: [
                { label: 'Home', icon: 'Home', path: '/' },
                { label: 'Category', icon: 'LayoutGrid', path: '/categories' },
                { label: 'Print', icon: 'Printer', path: '/print-store' },
                { label: 'Orders', icon: 'ShoppingBag', path: '/orders' },
                { label: 'Profile', icon: 'User', path: '/profile' }
            ]
        },

        customerHeaderNav: {
            type: [{
                label: { type: String },
                path: { type: String }
            }],
            default: [
                { label: 'Home', path: '/' },
                { label: 'Categories', path: '/categories' },
                { label: 'Offers', path: '/offers' }
            ]
        },

        deliveryBottomNav: {
            type: [{
                label: { type: String },
                icon: { type: String },
                path: { type: String }
            }],
            default: [
                { label: 'Home', icon: 'Home', path: '/delivery/dashboard' },
                { label: 'Earnings', icon: 'IndianRupee', path: '/delivery/earnings' },
                { label: 'History', icon: 'History', path: '/delivery/history' },
                { label: 'Profile', icon: 'User', path: '/delivery/profile' }
            ]
        },

        sellerSidebar: {
            type: [{
                label: { type: String },
                icon: { type: String },
                path: { type: String },
                end: { type: Boolean, default: false }
            }],
            default: [
                { label: 'Dashboard', path: '/seller', icon: 'HiOutlineSquares2X2', end: true },
                { label: 'Products', path: '/seller/products', icon: 'HiOutlineCube' },
                { label: 'Stock', path: '/seller/inventory', icon: 'HiOutlineArchiveBox' },
                { label: 'Orders', path: '/seller/orders', icon: 'HiOutlineTruck' },
                { label: 'Returns', path: '/seller/returns', icon: 'HiOutlineArchiveBox' },
                { label: 'Track Orders', path: '/seller/tracking', icon: 'HiOutlineMapPin' },
                { label: 'Sales Reports', path: '/seller/analytics', icon: 'HiOutlineChartBarSquare' },
                { label: 'Money Request', path: '/seller/withdrawals', icon: 'HiOutlineCurrencyDollar' },
                { label: 'Payment History', path: '/seller/transactions', icon: 'HiOutlineCreditCard' },
                { label: 'Earnings', path: '/seller/earnings', icon: 'HiOutlineCurrencyDollar' },
                { label: 'Profile', path: '/seller/profile', icon: 'HiOutlineUser' }
            ]
        },

        adminSidebar: {
            type: [{
                label: { type: String },
                icon: { type: String },
                path: { type: String },
                end: { type: Boolean, default: false }
            }],
            default: [
                { label: 'Dashboard', path: '/admin', icon: 'HiOutlineSquares2X2', end: true },
                { label: 'Customers', path: '/admin/customers', icon: 'HiOutlineUser' },
                { label: 'Sellers', path: '/admin/sellers', icon: 'HiOutlineUserGroup' },
                { label: 'Categories', path: '/admin/categories', icon: 'HiOutlineTag' },
                { label: 'Products', path: '/admin/products', icon: 'HiOutlineCube' },
                { label: 'Orders', path: '/admin/orders', icon: 'HiOutlineTruck' },
                { label: 'Analytics', path: '/admin/analytics', icon: 'HiOutlineChartBarSquare' },
                { label: 'Settings', path: '/admin/settings', icon: 'HiOutlineCog6Tooth' }
            ]
        },

        // --- Ecommerce Static Pages ---
        aboutUsData: {
            heroDescription: { type: String, default: "Delivering happiness to your doorstep in minutes." },
            missionTitle: { type: String, default: "Our Mission" },
            missionDescription: { type: String, default: "To revolutionize quick commerce by providing the fastest, most reliable delivery of daily essentials, ensuring quality and convenience for every household." },
            valuesTitle: { type: String, default: "Our Values" },
            values: {
                type: [{
                    title: { type: String },
                    description: { type: String }
                }],
                default: [
                    { title: "Customer First", description: "Your satisfaction is our top priority." },
                    { title: "Quality Assurance", description: "We deliver only the freshest and best products." },
                    { title: "Speed with Safety", description: "Fast delivery without compromising on safety standards." }
                ]
            }
        },
        privacyPolicyText: {
            type: String,
            default: "At our platform, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.\n\n1. Information We Collect\nWe collect information you provide directly, such as your name, address, phone number, and payment details. We also collect usage data automatically.\n\n2. How We Use Information\nWe use your data to process orders, improve our services, and communicate with you about promotions and updates.\n\n3. Data Security\nWe implement industry-standard security measures to protect your data. However, no method of transmission is 100% secure.\n\n4. Sharing of Information\nWe do not sell your personal data. We may share data with service providers (e.g., delivery partners) as necessary to fulfill your orders.\n\n5. Your Rights\nYou have the right to access, correct, or delete your personal data. Contact our support team for assistance."
        },
        termsText: {
            type: String,
            default: "Welcome to our platform. By using our services, you agree to these Terms and Conditions.\n\n1. Use of Service\nYou must provide accurate information when creating an account. You are responsible for maintaining the security of your account.\n\n2. Orders and Payments\nAll orders are subject to availability. Prices may change without notice. We reserve the right to cancel any order for any reason.\n\n3. Delivery\nDelivery times are estimates and not guaranteed. We are not liable for delays caused by external factors.\n\n4. Returns and Refunds\nPlease review our Return Policy for details on eligible returns and refund processing.\n\n5. Changes to Terms\nWe may update these terms at any time. Continued use of the service constitutes acceptance of updated terms."
        }
    },
    {
        timestamps: true,
    }
);

settingSchema.pre("save", function syncFinanceAliases(next) {
    if (!this.pricingMode && this.deliveryPricingMode) {
        this.pricingMode = this.deliveryPricingMode;
    }
    if (!this.deliveryPricingMode && this.pricingMode) {
        this.deliveryPricingMode = this.pricingMode;
    }

    if (this.baseDeliveryCharge == null) {
        this.baseDeliveryCharge = this.customerBaseDeliveryFee ?? 30;
    }
    if (this.customerBaseDeliveryFee == null) {
        this.customerBaseDeliveryFee = this.baseDeliveryCharge ?? 30;
    }

    if (this.riderBasePayout == null) {
        this.riderBasePayout = this.baseDeliveryCharge ?? this.customerBaseDeliveryFee ?? 30;
    }

    if (this.fleetCommissionRatePerKm == null && this.deliveryPartnerRatePerKm != null) {
        this.fleetCommissionRatePerKm = this.deliveryPartnerRatePerKm;
    }
    if (this.deliveryPartnerRatePerKm == null && this.fleetCommissionRatePerKm != null) {
        this.deliveryPartnerRatePerKm = this.fleetCommissionRatePerKm;
    }

    if (this.fixedDeliveryFee == null) {
        this.fixedDeliveryFee = this.baseDeliveryCharge ?? this.customerBaseDeliveryFee ?? 30;
    }

    next();
});

export default mongoose.model("Setting", settingSchema);
