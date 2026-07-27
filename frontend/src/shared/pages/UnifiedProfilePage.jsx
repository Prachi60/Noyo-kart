import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    User, MapPin, Package, CreditCard, Wallet, ChevronRight,
    LogOut, ShieldCheck, Heart, HelpCircle, Info, Edit2, ChevronLeft, Bell, Trash2,
    ShoppingBag, Star, Clipboard, FileText, Settings, Gift, Zap, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext';
import { useSettings } from '../../core/context/SettingsContext';
import { customerApi } from '../../modules/customer/services/customerApi';
import { userAuthService } from '../../modules/serviceProvider/services/authService';
import api from '../../modules/serviceProvider/services/api';
import { toast } from 'sonner';
import { ensureFcmTokenRegistered, startForegroundPushListener } from '../../core/firebase/pushClient';

const TEST_PUSH_STATUS_POLL_INTERVAL_MS = 1500;
const TEST_PUSH_STATUS_MAX_ATTEMPTS = 20;

const spIconMap = {
    FiShoppingBag: ShoppingBag,
    FiFileText: FileText,
    FiClipboard: Clipboard,
    FiStar: Star,
    FiMapPin: MapPin,
    FiSettings: Settings,
    FiHeadphones: HelpCircle,
    FiCheckCircle: Info,
    FiHelpCircle: HelpCircle
};

const defaultColors = ['#0284c7', '#f97316', '#10b981', '#fb7185', '#a855f7', '#3b82f6'];
const defaultBgs = ['rgba(2,132,199,0.1)', 'rgba(249,115,22,0.1)', 'rgba(16,185,129,0.1)', 'rgba(248,113,113,0.1)', 'rgba(168,85,247,0.1)', 'rgba(59,130,246,0.1)'];

const UnifiedProfilePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isSpMode = location.pathname.includes('/sp/user');

    const { user: qcUser, role, logout: qcLogout } = useAuth();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    
    const [isTestingPush, setIsTestingPush] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // SP State
    const [spProfile, setSpProfile] = useState({
        name: 'Verified Customer',
        phone: '',
        email: '',
        walletBalance: 0,
        plans: null,
        profilePhoto: ''
    });
    const [spMenus, setSpMenus] = useState([]);
    const [isLoadingSp, setIsLoadingSp] = useState(isSpMode);

    useEffect(() => {
        if (!isSpMode) return;

        const fetchSpData = async () => {
            try {
                const storedUserData = localStorage.getItem('userData');
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    setSpProfile(prev => ({
                        ...prev,
                        name: userData.name || 'Verified Customer',
                        phone: userData.phone || '',
                        email: userData.email || '',
                        profilePhoto: userData.profilePhoto || '',
                        walletBalance: userData.wallet?.balance ?? 0
                    }));
                }

                const response = await userAuthService.getProfile();
                if (response.success && response.user) {
                    setSpProfile({
                        name: response.user.name || 'Verified Customer',
                        phone: response.user.phone || '',
                        email: response.user.email || '',
                        profilePhoto: response.user.profilePhoto || '',
                        walletBalance: response.user.wallet?.balance ?? 0,
                        plans: response.user.plans
                    });
                }
            } catch (error) {
                console.error("Error fetching SP profile", error);
            }

            try {
                const configRes = await api.get('/public/config');
                if (configRes.data?.success && configRes.data?.settings?.accountMenus) {
                    const menus = configRes.data.settings.accountMenus.map(group => ({
                        group: group.group,
                        items: group.items.map((item, idx) => ({
                            icon: spIconMap[item.icon] || CheckCircle,
                            label: item.label,
                            path: item.path,
                            color: defaultColors[idx % defaultColors.length],
                            bg: defaultBgs[idx % defaultBgs.length]
                        }))
                    }));
                    setSpMenus(menus);
                } else {
                    // Fallback static menus for SP
                    setSpMenus([
                        {
                            group: "Shopping",
                            items: [
                                { icon: ShoppingBag, label: "Scrap Deals", path: "/sp/user/scrap", color: "#0284c7", bg: "rgba(2,132,199,0.10)" },
                                { icon: FileText, label: "My Plans", path: "/sp/user/my-plan", color: "#f97316", bg: "rgba(249,115,22,0.10)" }
                            ]
                        },
                        {
                            group: "Activity",
                            items: [
                                { icon: Clipboard, label: "My Bookings", path: "/sp/user/my-bookings", color: "#10b981", bg: "rgba(16,185,129,0.10)" },
                                { icon: Star, label: "My Ratings", path: "/sp/user/my-rating", color: "#fb7185", bg: "rgba(248,113,113,0.10)" }
                            ]
                        },
                        {
                            group: "Preferences",
                            items: [
                                { icon: MapPin, label: "Manage Addresses", path: "/sp/user/manage-addresses", color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
                                { icon: Settings, label: "Settings", path: "/sp/user/settings", color: "#64748b", bg: "rgba(100,116,139,0.10)" }
                            ]
                        }
                    ]);
                }
            } catch (error) {
                console.error("Error fetching SP settings", error);
            } finally {
                setIsLoadingSp(false);
            }
        };

        fetchSpData();
    }, [isSpMode]);

    const qcMenusData = [
        {
            group: "Personal Account",
            items: [
                { icon: Package, label: "Your Orders", sub: "Track, return or buy things again", path: "/orders", color: "#0284c7", bg: "rgba(16,185,129,0.10)" },
                { icon: CreditCard, label: "Order Transactions", sub: "View all payments & refunds", path: "/transactions", color: "#f97316", bg: "rgba(249,115,22,0.10)" },
                { icon: Wallet, label: "Wallet", sub: "Balance & return refunds", path: "/wallet", color: "#10b981", bg: "rgba(16,185,129,0.10)" },
                { icon: Heart, label: "Your Wishlist", sub: "Your saved items", path: "/wishlist", color: "#fb7185", bg: "rgba(248,113,113,0.08)" },
                { icon: MapPin, label: "Saved Addresses", sub: "Manage your delivery locations", path: "/addresses", color: "#0284c7", bg: "rgba(56,189,248,0.10)" }
            ]
        },
        {
            group: "Help & Settings",
            items: [
                { icon: HelpCircle, label: "Help & Support", path: "/support", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
                { icon: ShieldCheck, label: "Privacy Policy", path: "/privacy", color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
                { icon: Info, label: "About Us", path: "/about", color: "#14b8a6", bg: "rgba(45,212,191,0.08)" }
            ]
        }
    ];

    const currentMenus = isSpMode ? spMenus : qcMenusData;
    const currentUser = isSpMode ? spProfile : qcUser;
    
    // Fallback if SP profile isn't fully loaded but we have the context user
    const displayUser = currentUser?.name ? currentUser : qcUser;

    const handleLogout = async () => {
        if (isSpMode) {
            try {
                await userAuthService.logout();
                toast.success('Logged out successfully');
                navigate('/login');
            } catch (error) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userData');
                toast.success('Logged out successfully');
                navigate('/login');
            }
        } else {
            qcLogout();
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeletingAccount(true);
        try {
            if (isSpMode) {
                // Assuming customerApi handles delete for both or there's a specific SP endpoint. 
                // Using customerApi for now, or just logging out if no specific SP delete api exists.
                await customerApi.deleteAccount();
                toast.success("Account deleted successfully");
                handleLogout();
            } else {
                await customerApi.deleteAccount();
                toast.success("Account deleted successfully");
                qcLogout();
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to delete account");
        } finally {
            setIsDeletingAccount(false);
            setShowDeleteConfirm(false);
        }
    };

    const formatIndiaPhone = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.startsWith('+91')) return raw.replace(/^\+91[\s-]*/, '');
        if (raw.startsWith('91') && raw.length >= 12) return raw.replace(/^91[\s-]*/, '');
        return raw;
    };

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const waitForTestPushResult = async (orderId) => {
        for (let attempt = 0; attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS; attempt += 1) {
            const statusRes = await customerApi.getTestPushNotificationStatus(orderId);
            const result = statusRes?.data?.result || {};
            const status = String(result.status || '').trim().toLowerCase();

            if (status === 'sent' || status === 'failed') {
                return result;
            }

            if (attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS - 1) {
                await wait(TEST_PUSH_STATUS_POLL_INTERVAL_MS);
            }
        }
        return null;
    };

    const handleTestPush = async () => {
        if (isTestingPush) return;
        setIsTestingPush(true);
        try {
            await ensureFcmTokenRegistered({ role: isSpMode ? 'user' : role, platform: 'web' });
            await startForegroundPushListener();
            const res = await customerApi.testPushNotification();
            const orderId = res?.data?.result?.orderId || '';
            if (!orderId) {
                toast.success('Test push triggered');
                return;
            }

            const statusResult = await waitForTestPushResult(orderId);
            if (!statusResult) {
                toast.message(`Test push processing (${orderId})`, {
                    description: 'Notification delivery is taking longer than expected.',
                });
                return;
            }

            if (statusResult.status === 'sent') {
                toast.success(`Test push sent (${orderId})`, {
                    description: 'MongoDB status is marked as sent.',
                });
                return;
            }

            toast.error(`Test push failed (${orderId})`, {
                description: String(statusResult.failureReason || 'Notification delivery failed.'),
            });
        } catch (error) {
            toast.error('Failed to trigger test push', {
                description: error?.response?.data?.message || error?.message || 'Unknown error',
            });
        } finally {
            setIsTestingPush(false);
        }
    };

    if (isSpMode && isLoadingSp) {
        return <div className="flex h-screen items-center justify-center font-outfit">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 font-sans">
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-slate-200/60 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/70 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{isSpMode ? 'Account' : 'My Profile'}</h1>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleTestPush}
                        disabled={isTestingPush}
                        title="Test push notification"
                        className="w-10 h-10 flex items-center justify-center rounded-full transition-colors border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Bell size={18} className={isTestingPush ? "text-slate-400" : "text-slate-700"} />
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-1 relative z-20 space-y-4">

                {/* User Identity Card */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center p-1 border border-slate-200 overflow-hidden">
                            {displayUser?.profilePhoto ? (
                                <img src={displayUser.profilePhoto} alt={displayUser.name} className="h-full w-full rounded-lg object-cover" />
                            ) : (
                                <div className="h-full w-full rounded-lg bg-white flex items-center justify-center">
                                    <User size={28} className="text-slate-700" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-base leading-tight font-semibold text-slate-900">{displayUser?.name || 'Customer'}</h2>
                            <p className="text-slate-500 text-xs font-medium flex items-center gap-1 mt-0.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase">India</span> +91 {formatIndiaPhone(displayUser?.phone)}
                            </p>
                        </div>
                    </div>
                    <Link to={isSpMode ? "/sp/user/update-profile" : "/profile/edit"} className="p-2.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                        <Edit2 size={16} />
                    </Link>
                </div>

                {/* SP Specific Cards */}
                {isSpMode && spProfile.plans && spProfile.plans.isActive && (
                    <div 
                        onClick={() => navigate('/sp/user/my-plan')}
                        className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-4 text-white shadow-md cursor-pointer border border-teal-700 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Zap size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck size={16} className="text-teal-200" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-100">Membership Status</span>
                            </div>
                            <h3 className="text-xl font-bold mb-1">{spProfile.plans.name}</h3>
                            <div className="flex items-center gap-1.5 mt-2">
                                <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></div>
                                <span className="text-xs font-semibold text-teal-50">Expires: {new Date(spProfile.plans.expiry).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {isSpMode && (
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <button
                            onClick={() => navigate('/sp/user/wallet')}
                            className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-start hover:bg-slate-50 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-100 text-sky-600 mb-2">
                                <Wallet size={18} />
                            </div>
                            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Balance</span>
                            <p className={`text-lg font-bold mt-0.5 ${spProfile.walletBalance < 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                                ₹{Math.abs(spProfile.walletBalance || 0).toLocaleString('en-IN')}
                            </p>
                        </button>
                        <button
                            onClick={() => navigate('/sp/user/rewards')}
                            className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-start hover:bg-slate-800 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-500/20 text-yellow-400 mb-2">
                                <Gift size={18} />
                            </div>
                            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Rewards</span>
                            <p className="text-lg font-bold text-white mt-0.5">Refer & Earn</p>
                        </button>
                    </div>
                )}

                {/* Menu Sections */}
                <div className="space-y-4">
                    {currentMenus.map((section, idx) => (
                        <div key={idx} className="bg-white rounded-xl overflow-hidden border border-slate-200">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{section.group}</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {section.items.map((item, i) => (
                                    <MenuItem
                                        key={i}
                                        icon={item.icon}
                                        label={item.label}
                                        sub={item.sub}
                                        path={item.path}
                                        color={item.color}
                                        bg={item.bg}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {/* Extra SP Menu for Support if not present in API menus */}
                    {isSpMode && currentMenus.length === 0 && (
                        <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                             <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Help & Settings</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                <MenuItem icon={HelpCircle} label="Help & Support" path="/sp/user/help-support" color="#3b82f6" bg="rgba(59,130,246,0.08)" />
                                <MenuItem icon={Info} label="About Homestr" path="/sp/user/about-homestr" color="#14b8a6" bg="rgba(45,212,191,0.08)" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold bg-white hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                    <LogOut size={20} />
                    Sign out
                </button>

                {/* Delete Account Button */}
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 rounded-lg border border-rose-200 text-rose-500 font-semibold bg-white hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 size={18} />
                    Delete Account
                </button>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center">
                                    <Trash2 size={26} className="text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Delete Account?</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    This will permanently delete your account and all associated data. This action <span className="font-semibold text-slate-700">cannot be undone</span>.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeletingAccount}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeletingAccount}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isDeletingAccount ? (
                                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "Yes, Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-center pb-8 pt-2">
                    <p className="text-[10px] text-slate-400 font-medium">Version {isSpMode ? '7.6.27' : '2.4.0'} - {isSpMode ? 'Homestr' : appName}</p>
                </div>

            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, sub, path, color = '#334155', bg = 'rgba(148,163,184,0.12)' }) => (
    <Link to={path || '#'} className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group">
        <div className="flex items-center gap-3">
            <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: bg }}
            >
                <Icon
                    size={20}
                    className="transition-colors"
                    style={{ color }}
                />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
                {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
        <div className="p-1.5 rounded-md group-hover:bg-slate-100 transition-colors">
            <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-all group-hover:translate-x-0.5" />
        </div>
    </Link>
);

export default UnifiedProfilePage;
