import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deliveryApi } from "../services/deliveryApi";

/**
 * DeliverySlideButton - A slide-to-confirm button for delivery actions
 * 
 * This component handles the slide gesture to trigger OTP generation.
 * It calls the generate-otp endpoint which uses the delivery person's stored location
 * from the database for proximity validation.
 * 
 * @param {Object} props
 * @param {string} props.orderId - The order ID for OTP generation
 * @param {Function} props.onSuccess - Callback when OTP is successfully generated
 * @param {Function} props.onError - Callback when an error occurs
 * @param {string} props.label - Label text for the slide button (default: "SLIDE TO GENERATE OTP")
 * @param {string} props.bgColor - Background color class (default: "bg-brand-600")
 * @param {string} props.bgColorLight - Light background color class (default: "bg-brand-50")
 */
const DeliverySlideButton = ({
  orderId,
  onSuccess,
  onError,
  isReturn = false,
  isReturnDrop = false,
  label = "SLIDE TO GENERATE OTP",
  bgColor = "bg-indigo-600",
  bgColorLight = "bg-indigo-50",
}) => {
  const [isSlideComplete, setIsSlideComplete] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Reset slide state when orderId changes
  useEffect(() => {
    setIsSlideComplete(false);
    setDragX(0);
    setIsLoading(false);
  }, [orderId]);

  const resetSlide = () => {
    setIsSlideComplete(false);
    setDragX(0);
    setIsLoading(false);
  };

  /**
   * Handle slide completion - generate OTP using stored location
   */
  const handleSlideComplete = async () => {
    setIsLoading(true);

    try {
      // Call appropriate endpoint based on flow type
      const response = isReturnDrop
        ? await deliveryApi.requestReturnDropOtp(orderId, {})
        : isReturn 
        ? await deliveryApi.requestReturnOtp(orderId, {})
        : await deliveryApi.generateDeliveryOtp(orderId);

      // Handle success
      toast.success(response.data?.message || "OTP generated and sent to customer");
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      // Handle different error types
      // The backend returns { message, result: { error: { code, message, details } } }
      const resData = error.response?.data;
      const errorMessage = resData?.message || error.message || "Failed to generate OTP";
      const errorCode = resData?.result?.error?.code || resData?.result?.code;
      const errorDetails = resData?.result?.error?.details || resData?.result;

      // Display user-friendly error messages
      if (errorCode === "PROXIMITY_OUT_OF_RANGE") {
        const distance = errorDetails?.currentDistance;
        const range = errorDetails?.requiredRange || "0-500m";
        const distanceText = distance > 1000 
          ? `${(distance / 1000).toFixed(2)}km` 
          : `${Math.round(distance)}m`;
        
        toast.error(
          `Proximity check failed. You are currently ${distanceText} away. You must be within ${range} of the delivery location.`,
          { duration: 8000 }
        );
      } else if (errorCode === "LOCATION_REQUIRED" || errorCode === "LOCATION_STALE") {
        toast.error(errorMessage || "Location data is not available. Please ensure location tracking is enabled.");
      } else if (errorCode === "ORDER_NOT_FOUND") {
        toast.error("Order not found. Please refresh and try again.");
      } else if (errorCode === "UNAUTHORIZED_DELIVERY") {
        toast.error("This order is not assigned to you.");
      } else {
        toast.error(errorMessage);
      }

      if (onError) {
        onError(error);
      }

      resetSlide();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-16 bg-gray-100 rounded-full overflow-hidden select-none">
      {/* Label text */}
      <motion.div
        className={`absolute inset-0 flex items-center justify-center text-gray-400 font-bold text-sm pointer-events-none transition-opacity duration-300 ${
          dragX > 50 || isLoading ? "opacity-0" : "opacity-100"
        }`}
        animate={{ x: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}>
        {label} <ChevronRight className="ml-1 inline" />
      </motion.div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span className="ml-2 text-sm font-medium text-gray-600">
            {isReturn ? "Requesting OTP..." : "Generating OTP..."}
          </span>
        </div>
      )}

      {/* Progress background */}
      <motion.div
        className={`absolute inset-y-0 left-0 ${bgColorLight} opacity-50`}
        style={{ width: Math.min(dragX + 60, 340) }}
      />

      {/* Draggable button */}
      <motion.div
        className={`absolute top-1 bottom-1 left-1 w-14 rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing z-20 ${bgColor}`}
        drag="x"
        dragConstraints={{ left: 0, right: 280 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDrag={(_, info) => {
          if (!isLoading) {
            setDragX(Math.max(0, info.offset.x));
          }
        }}
        onDragEnd={(_, info) => {
          if (isLoading) return;

          if (info.offset.x > 150) {
            setIsSlideComplete(true);
            handleSlideComplete();
          } else {
            setDragX(0);
          }
        }}
        animate={{ x: isSlideComplete ? 280 : 0 }}
        whileHover={{ scale: isLoading ? 1 : 1.05 }}
        whileTap={{ scale: isLoading ? 1 : 0.95 }}
        style={{ pointerEvents: isLoading ? "none" : "auto" }}>
        <ChevronRight className="text-white" size={24} />
      </motion.div>
    </div>
  );
};

export default DeliverySlideButton;
