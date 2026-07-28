import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import StorefrontIcon from "@mui/icons-material/Storefront";

const SPHomeHeader = ({
  onSearchClick,
  searchPlaceholderText = "Search for services...",
  cartCount,
  onCartClick,
  onProfileClick,
  currentCity,
  fullAddress,
  onLocationClick,
  onSwitchAppClick
}) => {
  const qcLabels = ["Quick Commerce", "Go Shop", "10 Min Delivery"];
  const [qcIndex, setQcIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQcIndex((prev) => (prev + 1) % qcLabels.length);
    }, 3000); // Change text every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm pb-3">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6">
        {/* Top Row: Location, Icons */}
        <div className="flex items-center justify-between h-16">
          {/* Left: Location (Urban Company style puts location prominently) */}
          <div className="flex flex-col cursor-pointer max-w-[40%] lg:max-w-[40%]" onClick={onLocationClick}>
            <div className="flex items-center text-gray-900 font-bold text-sm md:text-base">
              <LocationOnIcon className="w-5 h-5 mr-1 text-slate-800" sx={{ fontSize: 22 }} />
              <span className="truncate">
                {currentCity?.name || 'Select Location'}
              </span>
              <KeyboardArrowDownIcon className="w-4 h-4 ml-0.5 text-gray-500" />
            </div>
            {fullAddress && fullAddress !== 'Select Location' && (
              <p className="text-[10px] md:text-[11px] text-gray-500 truncate ml-6 -mt-0.5">
                {fullAddress}
              </p>
            )}
          </div>

          {/* Right: Cart and Profile */}
          <div className="flex items-center space-x-1.5 md:space-x-4">
            <button
              onClick={onSwitchAppClick}
              className="flex items-center space-x-1 px-2 py-1.5 md:px-4 md:py-2 bg-gray-900 hover:bg-black text-white rounded-full transition-all duration-300 font-medium text-[10px] md:text-sm shadow-sm active:scale-95"
              title="Switch to Quick Commerce"
            >
              <StorefrontIcon sx={{ fontSize: 16 }} className="text-white z-10" />
              <div className="relative h-4 md:h-5 overflow-hidden flex items-center min-w-[85px] md:min-w-[110px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={qcIndex}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute whitespace-nowrap"
                  >
                    {qcLabels[qcIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </button>
            
            <button
              onClick={onCartClick}
              className="p-1.5 md:p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors relative"
            >
              <ShoppingCartOutlinedIcon sx={{ fontSize: 24 }} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-md">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={onProfileClick}
              className="p-1.5 md:p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <AccountCircleOutlinedIcon sx={{ fontSize: 26 }} />
            </button>
          </div>
        </div>

        {/* Bottom Row: Large Search Bar */}
        <div className="mt-1" onClick={onSearchClick}>
          <div className="flex items-center w-full h-12 bg-white border border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-xl px-4 cursor-text transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
            <SearchIcon className="text-gray-400 mr-3" />
            <span className="text-gray-500 font-medium text-sm w-full truncate">
              {searchPlaceholderText}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SPHomeHeader;
