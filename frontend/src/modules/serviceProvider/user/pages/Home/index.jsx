import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { themeColors } from '../../../theme';
import MainLocationHeader from '../../../../customer/components/shared/MainLocationHeader';
import HomeIcon from "@mui/icons-material/Home";
import BuildIcon from "@mui/icons-material/Build";
import LocalCafeIcon from "@mui/icons-material/LocalCafe";
import DevicesIcon from "@mui/icons-material/Devices";
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ServiceCategories from './components/ServiceCategories';
import { publicCatalogService } from '../../../services/catalogService';
import { useCart } from '../../../context/CartContext';
import { useCity } from '../../../context/CityContext';
import { toast } from 'react-hot-toast';
import { registerFCMToken } from '../../../services/pushNotificationService';
import { motion } from 'framer-motion';
import { customerApi } from '../../../../customer/services/customerApi';
import { getIconSvg } from '@/shared/constants/categoryIcons';

// Lazy load heavy components for better initial load performance
import PromoCarousel from './components/PromoCarousel';
// Lazy load OTHER heavy components
const NewAndNoteworthy = lazy(() => import('./components/NewAndNoteworthy'));
const MostBookedServices = lazy(() => import('./components/MostBookedServices'));
const CuratedServices = lazy(() => import('./components/CuratedServices'));
const ServiceSectionWithRating = lazy(() => import('./components/ServiceSectionWithRating'));
const Banner = lazy(() => import('./components/Banner'));
const ReferEarnSection = lazy(() => import('./components/ReferEarnSection'));
import CategoryModal from './components/CategoryModal';
import SearchOverlay from './components/SearchOverlay';
import LogoLoader from '@sp/user/components/common/LogoLoader';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';

import DebugConsole from '../../components/common/DebugConsole';
import LenisScroll from '../../../../../shared/components/LenisScroll';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const GLOBAL_CATEGORIES = [
  {
    id: "all",
    name: "All",
    icon: HomeIcon,
    theme: { gradient: "linear-gradient(to bottom, #0284c7, #38bdf8)", shadow: "shadow-cyan-500/20", accent: "text-[#1A1A1A]" },
    headerColor: "#0e7490",
  },
  {
    id: "sp-link",
    name: "Services",
    icon: BuildIcon,
    theme: { gradient: "linear-gradient(to bottom, #475569, #94a3b8)", shadow: "shadow-slate-500/20", accent: "text-slate-900" },
    headerColor: "#475569",
  },
  {
    id: "daily-essentials",
    name: "Daily Essentials",
    icon: LocalCafeIcon,
    theme: { gradient: "linear-gradient(to bottom, #FF9F1C, #FFBF69)", shadow: "shadow-orange-500/20", accent: "text-orange-900" },
    headerColor: "#ea580c",
  },
  {
    id: "electronics",
    name: "Electronics",
    icon: DevicesIcon,
    theme: { gradient: "linear-gradient(to bottom, #7209B7, #B5179E)", shadow: "shadow-purple-500/20", accent: "text-purple-900" },
    headerColor: "#6b21a8",
  },
  {
    id: "grocery",
    name: "Grocery",
    icon: LocalGroceryStoreIcon,
    theme: { gradient: "linear-gradient(to bottom, #FF9F1C, #FFBF69)", shadow: "shadow-orange-500/20", accent: "text-orange-900" },
    headerColor: "#ea580c",
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: LocalHospitalIcon,
    theme: { gradient: "linear-gradient(to bottom, #4361EE, #4895EF)", shadow: "shadow-indigo-500/20", accent: "text-indigo-900" },
    headerColor: "#3730a3",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [address, setAddress] = useState(localStorage.getItem('currentAddress') || 'Select Location');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSupported, setIsLocationSupported] = useState(true);
  const [detectedCityName, setDetectedCityName] = useState(localStorage.getItem('currentCity') || null);


  const { cartCount, addToCart } = useCart();
  const { currentCity, cities, selectCity, loading: cityLoading } = useCity();

  // Clean up legacy storage keys on mount
  useEffect(() => {
    ['userAddress', 'detectedCity', 'user_formatted_address', 'user_city'].forEach(key => localStorage.removeItem(key));
  }, []);

  // Sync detectedCityName with Address on mount/update if not already set
  useEffect(() => {
    if (address && address !== 'Select Location' && cities && cities.length > 0) {
      const foundCity = cities.find(c =>
        address.toLowerCase().includes(c.name.toLowerCase())
      );
      if (foundCity) {
        if (detectedCityName !== foundCity.name) {
          setDetectedCityName(foundCity.name);
          localStorage.setItem('currentCity', foundCity.name);
        }
      } else {
        // Address is present but doesn't contain any supported city name
        // Try to parse ANY city from the address string (e.g. "Bhopal")
        const parts = address.split(',').map(p => p.trim());
        // Usually city is 2nd or 3rd to last in Google address strings
        const cityCandidate = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);

        if (detectedCityName !== cityCandidate) {
          setDetectedCityName(cityCandidate);
          localStorage.setItem('currentCity', cityCandidate);
        }
        setIsLocationSupported(false);
      }
    }
  }, [address, cities, detectedCityName]);

  // Validate city whenever detected name or cities list changes
  useEffect(() => {
    if (!detectedCityName || !cities || cities.length === 0) return;

    const matchedCity = cities.find(c =>
      c.name.toLowerCase() === detectedCityName.toLowerCase() ||
      c.name.toLowerCase().includes(detectedCityName.toLowerCase()) ||
      detectedCityName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (matchedCity) {
      setIsLocationSupported(true);
      const matchedId = matchedCity._id || matchedCity.id;
      const currentId = currentCity?._id || currentCity?.id;

      if (!cityLoading && currentId && matchedId !== currentId) {
        selectCity(matchedCity);
        toast.success(`Location updated to ${matchedCity.name}`);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } else {
      setIsLocationSupported(false);
      if (currentCity) selectCity(null);
    }
  }, [detectedCityName, cities, currentCity, cityLoading]);


  const handleAddressSave = (savedHouseNumber, locationObj) => {
    if (locationObj) {
      const newAddress = locationObj.address;
      setAddress(newAddress);
      localStorage.setItem('currentAddress', newAddress);

      // Try to parse city from location object (Google Places)
      const components = locationObj.components || locationObj.address_components;
      let city = '';
      if (components) {
        const getComponent = (type) => components.find(c => c.types.includes(type))?.long_name || '';
        city = getComponent('locality') || getComponent('administrative_area_level_2');
      }

      // Fallback city parsing from address string if components failed
      if (!city && newAddress) {
        const parts = newAddress.split(',').map(p => p.trim());
        city = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);
      }

      if (city) {
        setDetectedCityName(city);
        localStorage.setItem('currentCity', city);

        // Immediate update of selected city if supported
        if (cities && cities.length > 0) {
          const matchedCity = cities.find(c =>
            c.name.toLowerCase() === city.toLowerCase() ||
            c.name.toLowerCase().includes(city.toLowerCase()) ||
            city.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCity) {
            selectCity(matchedCity);
          } else {
            selectCity(null);
          }
        }

        toast.success(`Location set to ${city}`);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
    setHouseNumber(savedHouseNumber);
    setIsAddressModalOpen(false);
  };

  // Auto-detect location on mount
  useEffect(() => {
    const autoDetectLocation = async () => {
      if (navigator.geolocation) {
        if (address === 'Select Location') {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                const response = await fetch(
                  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
                );
                const data = await response.json();

                if (data.status === 'OK' && data.results.length > 0) {
                  const result = data.results[0];
                  const getComponent = (type) =>
                    result.address_components.find(c => c.types.includes(type))?.long_name || '';

                  const area = getComponent('sublocality_level_1') || getComponent('neighborhood') || getComponent('locality');
                  const city = getComponent('locality') || getComponent('administrative_area_level_2');
                  const state = getComponent('administrative_area_level_1');

                  const formattedAddress = `${area}, ${city}, ${state}`;
                  setAddress(formattedAddress);
                  localStorage.setItem('currentAddress', formattedAddress);

                  if (city) {
                    setDetectedCityName(city);
                    localStorage.setItem('currentCity', city);

                    // Immediate update of selected city if supported
                    if (cities && cities.length > 0) {
                      const matchedCity = cities.find(c =>
                        c.name.toLowerCase() === city.toLowerCase() ||
                        c.name.toLowerCase().includes(city.toLowerCase()) ||
                        city.toLowerCase().includes(c.name.toLowerCase())
                      );
                      if (matchedCity) {
                        selectCity(matchedCity);
                      } else {
                        selectCity(null);
                      }
                    }
                  }
                }
              } catch {
                // Silent fail
              }
            },
            (error) => {
              console.log("GPS Error:", error);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            }
          );
        }
      }
    };

    autoDetectLocation();

    // Register FCM token for user to receive push notifications
    registerFCMToken('user', true).catch(() => {/* Silent fail */ });
  }, []);

  const [categories, setCategories] = useState([]);
  const [globalCategories, setGlobalCategories] = useState([]);
  const [homeContent, setHomeContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch global categories on mount
  useEffect(() => {
    const fetchGlobalCategories = async () => {
      try {
        const { data } = await customerApi.getCategories();
        if (data?.success && data?.data) {
          const formattedCategories = data.data.map(cat => ({
            id: cat._id,
            _id: cat._id,
            name: cat.name,
            title: cat.name,
            icon: cat.icon,
            iconSvg: getIconSvg(cat.name)
          }));
          setGlobalCategories(formattedCategories);
        }
      } catch (error) {
        console.error('Failed to load global categories:', error);
      }
    };
    fetchGlobalCategories();
  }, []);

  // Handle scroll separately (only when needed)
  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state?.scrollToTop, location.pathname]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Fetch categories and home content on mount (and when city changes)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const cityId = currentCity?._id || currentCity?.id;

        const response = await publicCatalogService.getHomeData(cityId);

        if (response.success) {
          const payload = response.data || response;
          const rawCategories = payload.categories || [];
          const rawHomeContent = payload.homeContent || null;

          if (rawCategories.length) {
            const mappedCategories = rawCategories.map(cat => ({
              id: cat._id || cat.id,
              _id: cat._id || cat.id,
              title: cat.title,
              slug: cat.slug,
              icon: toAssetUrl(cat.homeIconUrl || cat.iconUrl || cat.icon || ''),
              homeIconUrl: cat.homeIconUrl || cat.iconUrl || cat.icon || '',
              hasSaleBadge: cat.hasSaleBadge,
              badge: cat.homeBadge || cat.badge
            }));
            setCategories(mappedCategories);
          }

          if (rawHomeContent) {
            setHomeContent(rawHomeContent);
          }
        }

        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentCity]);
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  // Open category modal from navigation state (e.g. from Cart 'Add Services')
  useEffect(() => {
    if (!loading && categories.length > 0 && (location.state?.openCategoryId || location.state?.openCategoryName)) {
      const targetId = location.state.openCategoryId;
      const targetName = location.state.openCategoryName;

      const cat = categories.find(c =>
        (targetId && (c.id === targetId || c._id === targetId)) ||
        (targetName && c.title === targetName)
      );

      if (cat) {
        handleCategoryClick(cat);
        // Clear state to prevent reopening on subsequent renders/refreshes
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [loading, categories, location.state, location.pathname]);

  const handlePromoClick = (promo) => {
    if (promo.targetCategoryId) {
      const cat = categories.find(c => (c.id === promo.targetCategoryId || c._id === promo.targetCategoryId));
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
    }
    if (promo.route && !promo.slug) {
      if (promo.scrollToSection) {
        navigate(promo.route, {
          state: { scrollToSection: promo.scrollToSection }
        });
      } else {
        navigate(promo.route);
}
    }
  };

  const handleServiceClick = (service) => {
    if (service.targetCategoryId) {
      const cat = categories.find(c => c.id === service.targetCategoryId || c._id === service.targetCategoryId);
      if (cat) {
        handleCategoryClick({
          ...cat,
          initialBrand: service.targetServiceId ? { id: service.targetServiceId } : null
        });
      } else {
        // Fallback if category is not in the main list
        handleCategoryClick({
          id: service.targetCategoryId,
          _id: service.targetCategoryId,
          title: service.title || 'Category',
          initialBrand: service.targetServiceId ? { id: service.targetServiceId } : null
        });
      }
    }
  };

  const handleAddClick = async (service) => {
    try {
      if (service.targetCategoryId) {
        const cat = categories.find(c => c.id === service.targetCategoryId);
        if (cat) {
          handleCategoryClick(cat);
          return;
        }
      }

      if (service.serviceId && service.categoryId) {
        const cartItemData = {
          serviceId: service.serviceId,
          categoryId: service.categoryId,
          title: service.title,
          description: service.subtitle || service.description || '',
          icon: service.image || '',
          category: service.category || 'Service',
          price: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          originalPrice: service.originalPrice ? parseInt(service.originalPrice.toString().replace(/,/g, '')) : null,
          unitPrice: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          serviceCount: 1,
          rating: service.rating || "4.8",
          reviews: service.reviews || "10k+",
          vendorId: service.vendorId || null,
          sectionId: service.sectionId || null // VITAL: Added for plan benefits
        };

        const response = await addToCart(cartItemData);
        if (response.success) {
          toast.success(`${service.title} added to cart!`);
          navigate('/user/cart');
        } else {
          toast.error(response.message || 'Failed to add to cart');
        }
      } else {
        if (service.targetCategoryId) {
          const cat = categories.find(c => (c.id === service.targetCategoryId || c._id === service.targetCategoryId));
          if (cat) {
            handleCategoryClick(cat);
          } else {
            toast.error('Unable to add this service to cart.');
          }
        } else {
          toast.error('Unable to add this service to cart.');
        }
      }
    } catch {
      toast.error('Failed to add to cart. Please try again.');
    }
  };

  const handleReferClick = () => {
    navigate('/user/rewards');
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen pb-16 relative bg-white">
      <LenisScroll />
      {/* Refined Brand Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.teal || '#347989'}25 0%, transparent 70%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}20 0%, transparent 70%),
              radial-gradient(at 100% 100%, ${themeColors?.brand?.orange || '#BB5F36'}15 0%, transparent 75%),
              radial-gradient(at 0% 100%, ${themeColors?.brand?.teal || '#347989'}10 0%, transparent 70%),
              radial-gradient(at 50% 50%, ${themeColors?.brand?.teal || '#347989'}03 0%, transparent 100%),
              #FFFFFF
            `
          }}
        />
        {/* Elegant Dot Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.teal || '#347989'} 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <motion.div
        className="relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <MainLocationHeader
          categories={globalCategories.length > 0 ? globalCategories : GLOBAL_CATEGORIES}
          activeCategory={
            (globalCategories.length > 0 ? globalCategories : GLOBAL_CATEGORIES).find(c => c.name === 'Services' || c.title === 'Services') || 
            (globalCategories.length > 0 ? globalCategories[0] : GLOBAL_CATEGORIES[1])
          } // Services
          onCategorySelect={(c) => {
            if (c.id === 'sp-link' || c.name === 'Services' || c.title === 'Services') return; // Already on services
            // Navigate back to main app with category state
            navigate('/', { state: { openCategoryName: c.name || c.title } });
          }}
          onSearchClick={() => setIsSearchOpen(true)}
          searchPlaceholderText="Search Services..."
          typingPhrases={['"plumbers"', '"electricians"', '"cleaning"', '"repairs"']}
          cartCount={cartCount}
          onCartClick={() => navigate('/sp/user/cart')}
          onProfileClick={() => navigate('/sp/user/account')}
          onLogoClick={() => navigate('/')}
          onWishlistClick={() => navigate('/sp/user/my-bookings')}
        />

        <main className="pt-[205px] md:pt-[235px] space-y-4 pb-4 max-w-screen-xl mx-auto w-full">
          {!isLocationSupported ? (
            <div className="flex flex-col items-center justify-center pt-20 pb-10 px-6 text-center min-h-[60vh]">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Not service available in your city
              </h2>
              <p className="text-gray-500 max-w-xs mx-auto mb-8 font-medium">
                Please fast! We are coming soon.
              </p>
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold shadow-md hover:bg-primary-700 transition-all font-bold"
                style={{ backgroundColor: '#2874f0' }}
              >
                Change Location
              </button>
            </div>
          ) : (
            <>
              {/* Hero Section - Promo Carousel */}
              {homeContent?.isPromosVisible !== false && homeContent?.promos?.length > 0 && (
                <motion.section variants={itemVariants} className="relative z-0">
                  <PromoCarousel
                    promos={(homeContent.promos).sort((a, b) => (a.order || 0) - (b.order || 0)).map(promo => ({
                      id: promo.id || promo._id,
                      title: promo.title || '',
                      subtitle: promo.subtitle || promo.description || '',
                      buttonText: promo.buttonText || 'Book now',
                      className: promo.gradientClass || 'from-[#00A6A6] to-[#008a8a]',
                      image: toAssetUrl(promo.imageUrl),
                      targetCategoryId: promo.targetCategoryId,
                      slug: promo.slug,
                      scrollToSection: promo.scrollToSection,
                      route: '/'
                    }))}
                    onPromoClick={handlePromoClick}
                  />
                </motion.section>
              )}

              {/* Categories Section */}
              {homeContent?.isCategoriesVisible !== false && categories.length > 0 && (
                <motion.section variants={itemVariants} className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent pointer-events-none -z-10" />
                  <ServiceCategories
                    categories={categories}
                    onCategoryClick={handleCategoryClick}
                    onSeeAllClick={() => { }}
                  />
                </motion.section>
              )}


              {/* Curated Services */}
              {homeContent?.isCuratedVisible !== false && homeContent?.curated?.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <CuratedServices
                      services={(homeContent.curated).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        gif: toAssetUrl(item.gifUrl),
                        slug: item.slug,
                        targetCategoryId: item.targetCategoryId
                      }))}
                      onServiceClick={handleServiceClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* New & Noteworthy */}
              {homeContent?.isNoteworthyVisible !== false && homeContent?.noteworthy?.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <NewAndNoteworthy
                      services={(homeContent.noteworthy).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        image: toAssetUrl(item.imageUrl),
                        slug: item.slug,
                        targetCategoryId: item.targetCategoryId
                      }))}
                      onServiceClick={handleServiceClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Most Booked */}
              {homeContent?.isBookedVisible !== false && homeContent?.booked?.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <MostBookedServices
                      services={(homeContent.booked).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        rating: item.rating,
                        reviews: item.reviews,
                        price: item.price,
                        originalPrice: item.originalPrice,
                        discount: item.discount,
                        image: toAssetUrl(item.imageUrl),
                        targetCategoryId: item.targetCategoryId,
                        slug: item.slug
                      }))}
                      onServiceClick={handleServiceClick}
                      onAddClick={handleAddClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Dynamic Banner 1 */}
              {homeContent?.isBannersVisible !== false && homeContent?.banners?.[0] && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-32 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <Banner
                      imageUrl={toAssetUrl(homeContent.banners[0].imageUrl)}
                      onClick={() => {
                        const b = homeContent.banners[0];
                        if (b?.slug) {
                          navigate(`/user/${b.slug}`);
                          return;
                        }
                        if (b?.targetCategoryId) {
                          const cat = categories.find(c => c.id === b.targetCategoryId);
                          if (cat) handleCategoryClick(cat);
                        }
                      }}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Dynamic Sections */}
              {homeContent?.isCategorySectionsVisible !== false && [...(homeContent?.categorySections || [])]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .filter(section => section.cards?.length > 0)
                .map((section, sIdx) => (
                <motion.div key={section._id || sIdx} variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <ServiceSectionWithRating
                      title={section.title}
                      subtitle={section.subtitle}
                      services={section.cards.map((card, cIdx) => {
                        const processedImage = toAssetUrl(card.imageUrl);
                        return {
                          id: card._id || cIdx,
                          title: card.title,
                          rating: card.rating || "4.8",
                          reviews: card.reviews || "10k+",
                          price: card.price,
                          originalPrice: card.originalPrice,
                          discount: card.discount,
                          image: processedImage,
                          targetCategoryId: card.targetCategoryId,
                          slug: card.slug
                        };
                      })}
                      onSeeAllClick={() => {
                        if (section.seeAllTargetCategoryId) {
                          const cat = categories.find(c => (c.id === section.seeAllTargetCategoryId || c._id === section.seeAllTargetCategoryId));
                          if (cat) {
                            handleCategoryClick(cat);
                          } else {
                            // Fallback if category is not in the main list
                            handleCategoryClick({
                              id: section.seeAllTargetCategoryId,
                              _id: section.seeAllTargetCategoryId,
                              title: section.title,
                              slug: section.seeAllSlug
                            });
                          }
                        }
                      }}
                      onServiceClick={(service) => handleServiceClick(service)}
                      onAddClick={handleAddClick}
                    />
                  </Suspense>
                </motion.div>
              ))}

              {/* Dynamic Banner 2 */}
              {homeContent?.isBannersVisible !== false && homeContent?.banners?.[1] && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-32 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <Banner
                      imageUrl={toAssetUrl(homeContent.banners[1].imageUrl)}
                      onClick={() => {
                        const b = homeContent.banners[1];
                        if (b?.targetCategoryId) {
                          const cat = categories.find(c => (c.id === b.targetCategoryId || c._id === b.targetCategoryId));
                          if (cat) handleCategoryClick(cat);
                        }
                      }}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Refer & Earn Section */}
              {homeContent?.isReferEarnVisible !== false && homeContent?.referEarn && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-32 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <ReferEarnSection data={homeContent.referEarn} onReferClick={handleReferClick} />
                  </Suspense>
                </motion.div>
              )}
            </>
          )}
        </main>
      </motion.div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        location={address}
        cartCount={cartCount}
        currentCity={currentCity}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        categories={categories}
        onCategoryClick={handleCategoryClick}
      />

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleAddressSave}
      />

      <DebugConsole />
    </div>
  );
};

export default Home;
