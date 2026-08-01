import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../theme';
import {
  FiCheckCircle,
  FiMapPin,
  FiClock,
  FiCalendar,
  FiPackage,
  FiDollarSign,
  FiHome,
  FiArrowRight,
  FiLoader,
  FiArrowLeft,
  FiBell,
  FiXCircle,
  FiUser,
  FiNavigation,
  FiShield
} from 'react-icons/fi';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingService } from '../../../services/bookingService';
import NotificationBell from '../../components/common/NotificationBell';
import ConfirmDialog from '../../../vendor/components/common/ConfirmDialog';

const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

const SearchingMapUI = ({ booking, onBack, onCancel, apiKey }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const center = booking?.address?.lat && booking?.address?.lng 
    ? { lat: parseFloat(booking.address.lat), lng: parseFloat(booking.address.lng) }
    : { lat: 28.6139, lng: 77.2090 }; // default Delhi

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header Over Map */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start gap-3 pointer-events-none">
        <button 
          onClick={onBack}
          className="pointer-events-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0"
        >
          <FiArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        
        <div className="pointer-events-auto flex-1 bg-white rounded-3xl shadow-lg p-3 flex items-center gap-3 max-w-[280px]">
          <div className="w-10 h-10 rounded-full border border-teal-200 flex items-center justify-center bg-teal-50 shrink-0">
            <div className="w-5 h-5 border-[2.5px] border-teal-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-gray-900 truncate">Searching nearby experts...</h3>
            <p className="text-[10px] text-gray-500 font-medium tracking-wide truncate">Estimated wait: 30-60 sec</p>
          </div>
        </div>
      </div>

      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
           <GoogleMap
             mapContainerStyle={{ width: '100%', height: '100%' }}
             center={center}
             zoom={14}
             options={{
               styles: mapStyles,
               disableDefaultUI: true,
               gestureHandling: 'greedy'
             }}
           >
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                  <FiHome className="text-white w-5 h-5" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-teal-500/10 rounded-full animate-ping z-[-1]"></div>
             </div>
           </GoogleMap>
        ) : (
           <div className="w-full h-full bg-gray-100 animate-pulse"></div>
        )}
      </div>

      {/* Search Radius Indicator on Map */}
      <motion.div 
        animate={{ opacity: isExpanded ? 0 : 1, y: isExpanded ? 20 : 0 }}
        className="absolute bottom-[20vh] left-4 z-10 bg-white/90 backdrop-blur-sm rounded-3xl p-2 pr-4 flex items-center gap-3 shadow-lg pointer-events-none"
      >
        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
          <FiNavigation className="text-teal-600 w-4 h-4 -rotate-45" />
        </div>
        <div>
          <p className="text-[9px] font-bold text-gray-500 tracking-wider">SEARCH RADIUS</p>
          <p className="text-sm font-black text-teal-600">5 KM</p>
        </div>
      </motion.div>

      {/* Bottom Sheet */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-20 flex flex-col"
        animate={{ height: isExpanded ? '75vh' : 'auto' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Drag handle area */}
        <div 
          className="p-4 pb-2 cursor-pointer flex flex-col items-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6"></div>
          
          <div className="flex items-center justify-between w-full px-2">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Searching nearby experts</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse delay-75"></div>
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse delay-150"></div>
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse delay-300"></div>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <div className="px-6 pb-8 overflow-y-auto flex-1 mt-2">
          {/* Steps */}
          <div className="mt-4 space-y-7">
             <div className="flex items-center gap-4 relative">
               <div className="absolute left-3 top-8 bottom-[-20px] w-0.5 bg-gray-200"></div>
               <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center relative z-10 shadow-sm shadow-teal-500/30 shrink-0">
                 <FiCheckCircle className="text-white w-4 h-4" />
               </div>
               <span className="font-bold text-gray-900 text-[15px]">Booking Created</span>
             </div>
             
             <div className="flex items-center gap-4 relative">
               <div className="absolute left-3 top-8 bottom-[-20px] w-0.5 bg-gray-100"></div>
               <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin relative z-10 bg-white shrink-0"></div>
               <span className="font-semibold text-gray-600 text-[15px]">Searching Nearby Workers</span>
             </div>

             <div className="flex items-center gap-4 relative opacity-50">
               <div className="absolute left-3 top-8 bottom-[-20px] w-0.5 bg-gray-100"></div>
               <div className="w-6 h-6 rounded-full border-[2.5px] border-gray-300 relative z-10 bg-white shrink-0"></div>
               <span className="font-semibold text-gray-500 text-[15px]">Checking Availability</span>
             </div>

             <div className="flex items-center gap-4 relative opacity-50">
               <div className="absolute left-3 top-8 bottom-[-20px] w-0.5 bg-gray-100"></div>
               <div className="w-6 h-6 rounded-full border-[2.5px] border-gray-300 relative z-10 bg-white shrink-0"></div>
               <span className="font-semibold text-gray-500 text-[15px]">Waiting For Acceptance</span>
             </div>

             <div className="flex items-center gap-4 relative opacity-50">
               <div className="w-6 h-6 rounded-full border-[2.5px] border-gray-300 relative z-10 bg-white shrink-0"></div>
               <span className="font-semibold text-gray-500 text-[15px]">Technician Assigned</span>
             </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-10">
             <div className="bg-gray-50 p-4 rounded-[20px] flex flex-col items-start gap-1">
               <div className="flex items-center gap-2 text-gray-500">
                  <FiUser className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Workers Found</span>
               </div>
               <span className="text-2xl font-black text-gray-900 ml-1">0</span>
             </div>
             <div className="bg-gray-50 p-4 rounded-[20px] flex flex-col items-start gap-1">
               <div className="flex items-center gap-2 text-gray-500">
                  <FiCheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
               </div>
               <span className="text-2xl font-black text-gray-900 ml-1">0</span>
             </div>
             <div className="bg-gray-50 p-4 rounded-[20px] flex flex-col items-start gap-1">
               <div className="flex items-center gap-2 text-gray-500">
                  <FiNavigation className="w-4 h-4 text-blue-500 -rotate-45" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Requests Sent</span>
               </div>
               <span className="text-2xl font-black text-gray-900 ml-1">0</span>
             </div>
             <div className="bg-gray-50 p-4 rounded-[20px] flex flex-col items-start gap-1">
               <div className="flex items-center gap-2 text-gray-500">
                  <FiMapPin className="w-4 h-4 text-purple-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Radius</span>
               </div>
               <span className="text-2xl font-black text-gray-900 ml-1">5 KM</span>
             </div>
          </div>

          <div className="mt-6 bg-teal-50/50 rounded-2xl p-4 flex items-center justify-center gap-2 border border-teal-100/50">
             <FiShield className="text-teal-600 w-5 h-5 shrink-0" />
             <span className="text-[13px] font-bold text-gray-700">Verified & Background Checked Experts</span>
          </div>

          <button 
            onClick={onCancel}
            className="w-full mt-6 py-4 rounded-2xl font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            Cancel Request
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(!location.state?.noVendorsFound); // Respect passed state
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      try {
        setLoading(true);
        const response = await bookingService.getById(id);
        if (response.success) {
          const data = { ...response.data };
          // Calculate notional display values for plan_benefit
          if (data.paymentMethod === 'plan_benefit') {
            if (!data.tax) data.tax = (data.basePrice || 0) * 0.18;
            if (!data.visitingCharges && !data.visitationFee) data.visitingCharges = 49;
          }
          setBooking(data);

          // Check if vendor is already assigned
          const currentStatus = data.status?.toLowerCase();
          if (data.vendorId || (currentStatus !== 'requested' && currentStatus !== 'searching')) {
            setIsSearching(false);
          }
        } else {
          toast.error(response.message || 'Booking not found');
          navigate('/user/my-bookings');
        }
      } catch (error) {
        toast.error('Failed to load booking details');
        navigate('/user/my-bookings');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadBooking();
    }
  }, [id, navigate]);

  // Poll for vendor acceptance
  useEffect(() => {
    if (!isSearching || !id) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await bookingService.getById(id);
        if (response.success) {
          const updatedBooking = { ...response.data };

          // Calculate notional display values for plan_benefit
          if (updatedBooking.paymentMethod === 'plan_benefit') {
            if (!updatedBooking.tax) updatedBooking.tax = (updatedBooking.basePrice || 0) * 0.18;
            if (!updatedBooking.visitingCharges && !updatedBooking.visitationFee) updatedBooking.visitingCharges = 49;
          }

          setBooking(updatedBooking);
          // If vendor accepted or status changed
          const currentStatus = updatedBooking.status?.toLowerCase();
          if (updatedBooking.vendorId || (currentStatus !== 'requested' && currentStatus !== 'searching')) {
            setIsSearching(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isSearching, id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getAddressString = (address) => {
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object') {
      return `${address.addressLine1 || ''}${address.addressLine2 ? `, ${address.addressLine2}` : ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Booking not found</p>
          <button
            onClick={() => navigate('/user/my-bookings')}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: themeColors.button }}
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  const handleViewDetails = () => {
    navigate(`/user/booking/${booking._id || booking.id}`);
  };

  const handleGoHome = () => {
    navigate('/user', { replace: true });
  };

  const handleCancelBooking = async () => {
    try {
      setLoading(true);
      await bookingService.cancel(booking._id || booking.id, 'Cancelled during uncertain vendor search');
      toast.success('Booking cancelled successfully');
      navigate('/user');
    } catch (error) {
      console.error(error);
      toast.error('Failed to cancel booking');
      setLoading(false);
    }
  };

  if (isSearching) {
    return (
      <>
        <SearchingMapUI 
          booking={booking} 
          onBack={() => navigate(-1)} 
          onCancel={() => setConfirmDialog(true)} 
          apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} 
        />
        <ConfirmDialog
          isOpen={confirmDialog}
          onClose={() => setConfirmDialog(false)}
          onConfirm={handleCancelBooking}
          title="Cancel Booking Request"
          message="Are you sure you want to cancel this booking search?"
          confirmLabel="Yes, Cancel"
          cancelLabel="No, Keep It"
          type="danger"
        />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative bg-white">
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

      <div className="relative z-10">
        {/* Modern Glassmorphism Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/40 border-b border-black/[0.03] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-black/[0.02]"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-800" />
            </button>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Booking Sent</h1>
          </div>
          <NotificationBell />
        </header>

        <main className="px-4 py-6">
          {/* Success Icon - Show when confirmed */}
          {!isSearching && ['confirmed', 'assigned', 'journey_started', 'work_in_progress', 'visited', 'work_done', 'completed'].includes(booking?.status?.toLowerCase()) && (
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <FiCheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-black mb-2">Booking Confirmed!</h1>
              <p className="text-sm text-gray-600 text-center">
                Your booking has been confirmed. We'll send you updates via SMS.
              </p>
            </div>
          )}

          {/* Request Sent Icon - Show when status is requested but searching animation is stopped */}
          {!isSearching && booking?.status?.toLowerCase() === 'requested' && (
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4 border border-amber-100 shadow-sm">
                <FiBell className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2 italic tracking-tight">REQUEST SENT!</h1>
              <p className="text-sm text-gray-500 text-center max-w-[260px] font-medium leading-relaxed">
                Your request has been broadcasted to all nearby experts. We'll notify you the moment someone accepts.
              </p>
            </div>
          )}

          {/* Failure Icon - Show when expired/cancelled/rejected */}
          {!isSearching && ['expired', 'cancelled', 'rejected', 'failed', 'timeout'].includes(booking?.status?.toLowerCase()) && (
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <FiXCircle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">No Expert Found</h1>
              <p className="text-sm text-gray-500 text-center max-w-[260px] mb-6">
                We couldn't find a nearby expert for your request at this moment.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <FiArrowRight className="w-5 h-5" />
                Search Again
              </button>
            </div>
          )}

          {/* Booking ID Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Booking ID</p>
                <p className="text-base font-bold text-black">{booking.bookingNumber || booking._id || booking.id}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full ${(isSearching || booking?.status?.toLowerCase() === 'requested')
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                <span className="text-sm font-semibold">
                  {isSearching ? 'Finding Vendor...' : (booking?.status?.toLowerCase() === 'requested' ? 'Request Sent' : 'Confirmed')}
                </span>
              </div>
            </div>
          </div>

          {/* Service Details Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-black mb-3">Service Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                  <FiMapPin className="w-4 h-4" style={{ color: themeColors.button }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Service Address</p>
                  <p className="text-sm text-gray-700">{getAddressString(booking.address)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                  <FiCalendar className="w-4 h-4" style={{ color: themeColors.button }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                  <p className="text-sm text-gray-700">
                    {formatDate(booking.scheduledDate)} • {booking.scheduledTime || booking.timeSlot?.start || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Summary Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-black mb-4">Order Summary</h3>
            <div className="space-y-3">
              {/* Service Category */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                  {booking.categoryIcon ? (
                    <img src={booking.categoryIcon} alt="" className="w-5 h-5 object-contain" />
                  ) : (
                    <FiPackage className="w-4 h-4" style={{ color: themeColors.button }} />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service Category</p>
                  <p className="text-sm font-bold text-gray-800">{booking.serviceCategory || booking.serviceName || 'Service'}</p>
                </div>
              </div>

              {/* Brand */}
              {(() => {
                const brandName = booking.brandName || booking.bookedItems?.[0]?.brandName;
                const brandIcon = booking.brandIcon || booking.bookedItems?.[0]?.brandIcon;
                if (!brandName) return null;
                return (
                  <div className="flex items-center gap-3 pt-3 border-t border-dashed border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                      {brandIcon ? (
                        <img src={brandIcon} alt={brandName} className="w-6 h-6 object-contain" />
                      ) : (
                        <span className="text-base font-black text-slate-400">{brandName.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Brand</p>
                      <p className="text-sm font-bold text-gray-800">{brandName}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Service Cards */}
              {booking.bookedItems && booking.bookedItems.length > 0 ? (
                <div className="pt-3 border-t border-dashed border-gray-100 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Services Booked</p>
                  {booking.bookedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start bg-gray-50 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded border"
                            style={{ color: themeColors.button, backgroundColor: 'rgba(0,166,166,0.08)', borderColor: 'rgba(0,166,166,0.2)' }}>
                            ×{item.quantity}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 truncate">{item.card?.title || 'Service'}</span>
                        </div>
                        {item.card?.subtitle && <p className="text-xs text-gray-400 mt-0.5 ml-8 line-clamp-1">{item.card.subtitle}</p>}
                        {item.card?.duration && <p className="text-xs text-gray-400 mt-0.5 ml-8">⏱ {item.card.duration}</p>}
                      </div>
                      <span className="text-sm font-bold text-gray-900 ml-3 shrink-0">₹{((item.card?.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Payment Summary - Professional Card */}
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 mb-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: themeColors.gradient || themeColors.button }}></div>

            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${booking.paymentMethod === 'plan_benefit' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                {booking.paymentMethod === 'plan_benefit' ? (
                  <FiPackage className="w-5 h-5 text-amber-600" />
                ) : (
                  <FiDollarSign className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900">Payment Summary</h3>
            </div>

            <div className="space-y-3">
              {/* Base Price */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Base Price</span>
                {booking.paymentMethod === 'plan_benefit' ? (
                  <div className="flex items-center gap-2">
                    <span className="line-through text-slate-400 text-xs">₹{(booking.basePrice || 0).toLocaleString('en-IN')}</span>
                    <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">FREE ✓</span>
                  </div>
                ) : (
                  <span className="font-medium text-slate-900">₹{(booking.basePrice || 0).toLocaleString('en-IN')}</span>
                )}
              </div>

              {/* Discount */}
              {booking.paymentMethod !== 'plan_benefit' && booking.discount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600 font-medium">Discount</span>
                  <span className="font-medium text-green-600">-₹{booking.discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {/* Tax */}
              {(booking.tax > 0 || booking.paymentMethod === 'plan_benefit') && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">GST (18%)</span>
                  {booking.paymentMethod === 'plan_benefit' ? (
                    <div className="flex items-center gap-2">
                      <span className="line-through text-slate-400 text-xs">₹{(booking.tax || 0).toLocaleString('en-IN')}</span>
                      <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">FREE ✓</span>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-700">₹{(booking.tax || 0).toLocaleString('en-IN')}</span>
                  )}
                </div>
              )}

              {/* Convenience Fee */}
              {(booking.visitingCharges > 0 || booking.visitationFee > 0 || booking.paymentMethod === 'plan_benefit') && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Convenience Fee</span>
                  {booking.paymentMethod === 'plan_benefit' ? (
                    <div className="flex items-center gap-2">
                      <span className="line-through text-slate-400 text-xs">₹{(booking.visitingCharges || booking.visitationFee || 0).toLocaleString('en-IN')}</span>
                      <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">FREE ✓</span>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-700">₹{(booking.visitingCharges || booking.visitationFee || 0).toLocaleString('en-IN')}</span>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-slate-900">Total Paid</span>
                  <span className="text-xl font-black text-slate-900">
                    ₹{(booking.paymentMethod === 'plan_benefit' ? 0 : (booking.finalAmount || booking.totalAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Success Badge */}
            {(booking.paymentId || booking.paymentMethod === 'plan_benefit') && (
              <div className={`mt-4 pt-3 border-t border-dashed ${booking.paymentMethod === 'plan_benefit' ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-2 border rounded-lg p-3 ${booking.paymentMethod === 'plan_benefit' ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-200'}`}>
                  <FiCheckCircle className={`w-5 h-5 shrink-0 ${booking.paymentMethod === 'plan_benefit' ? 'text-amber-600' : 'text-green-600'}`} />
                  <div>
                    <p className={`text-sm font-bold ${booking.paymentMethod === 'plan_benefit' ? 'text-amber-700' : 'text-green-700'}`}>
                      {booking.paymentMethod === 'plan_benefit' ? 'Membership Benefit Applied' : 'Payment Successful'}
                    </p>
                    {booking.paymentId && <p className="text-xs text-green-600">ID: {booking.paymentId}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isSearching && (
              <button
                onClick={() => setConfirmDialog(true)}
                className="w-full py-3 rounded-lg text-base font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all mb-4"
              >
                Cancel Booking Request
              </button>
            )}

            <button
              onClick={handleViewDetails}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-base font-semibold text-white transition-all"
              style={{ backgroundColor: themeColors.button }}
            >
              View Full Details
              <FiArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoHome}
              className="w-full py-3 rounded-lg text-base font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Back to Home
            </button>
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        onConfirm={handleCancelBooking}
        title="Cancel Booking Request"
        message="Are you sure you want to cancel this booking search?"
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep It"
        type="danger"
      />
    </div>
  );
};

export default BookingConfirmation;
