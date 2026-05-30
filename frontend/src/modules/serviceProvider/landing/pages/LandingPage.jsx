import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FaUser, FaStore, FaHammer, FaArrowRight, FaQuoteLeft, FaStar,
  FaHandshake, FaToolbox, FaBolt, FaMapMarkerAlt, FaTv, FaTemperatureLow,
  FaTshirt, FaUtensils, FaMicrochip, FaGooglePlay, FaShieldAlt, FaMapMarker,
  FaFileInvoiceDollar, FaBars, FaTimes, FaMobileAlt, FaChartLine, FaTools
} from 'react-icons/fa';
import { configService } from '../../services/configService';

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const PLAY_STORE_URL = "https://play.google.com/store/search?q=truliq&c=apps";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const fetchSettings = async () => {
      const data = await configService.getSettings();
      if (data?.success) setSettings(data.settings);
    };
    fetchSettings();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const serviceCategories = [
    { name: 'AC Repair', icon: <FaToolbox />, color: 'text-blue-500' },
    { name: 'TV Repair', icon: <FaTv />, color: 'text-purple-500' },
    { name: 'Refrigerator', icon: <FaTemperatureLow />, color: 'text-cyan-500' },
    { name: 'Washing Machine', icon: <FaTshirt />, color: 'text-pink-500' },
    { name: 'Microwave', icon: <FaUtensils />, color: 'text-orange-500' },
    { name: 'Laptop/PC', icon: <FaMicrochip />, color: 'text-indigo-500' },
    { name: 'Mixer/Grinder', icon: <FaBolt />, color: 'text-yellow-500' },
    { name: 'More & Spares', icon: <FaShieldAlt />, color: 'text-brand' },
  ];

  const menuItems = [
    { label: 'Glimpse', href: '#app-glimpse' },
    { label: 'Expertise', href: '#expertise' },
    { label: 'Why Us', href: '#expertise' },
    { label: 'Join Us', href: '#join-platform' },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans selection:bg-brand selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-100 py-3 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-8 flex justify-between items-center max-w-7xl">
          <Link to="/sp/home" className="flex items-center gap-3 group">
            <img src="/truliq-logo.png" alt="Logo" className="h-9 sm:h-11 w-auto transition-transform group-hover:scale-110" />
          </Link>
          <nav className="hidden lg:flex gap-10 items-center font-black text-[11px] uppercase tracking-[0.2em] text-gray-900">
            {menuItems.map((item) => (
              <a key={item.label} href={item.href} className="hover:text-brand transition-all duration-300 relative group">
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
            <Link to="/sp/user" className="px-10 py-3.5 bg-brand text-white rounded-full hover:bg-gray-900 transition-all shadow-xl shadow-brand/20 font-black">
              Order Repair
            </Link>
          </nav>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-900 text-xl focus:outline-none">
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 py-8 px-8 flex flex-col gap-6 items-center text-center shadow-2xl z-50">
              {menuItems.map((item) => (
                <a key={item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-900 font-black text-xs uppercase tracking-[0.2em] hover:text-brand transition-colors">{item.label}</a>
              ))}
              <Link to="/sp/user" onClick={() => setIsMobileMenuOpen(false)}
                className="w-full max-w-xs py-4 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20">
                Order Repair
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Service Categories */}
      <section className="relative pt-20 sm:pt-24 pb-2 bg-white border-b border-gray-100 shadow-sm z-40 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex justify-between min-w-[700px] lg:min-w-0 gap-6 lg:gap-0 py-4">
            {serviceCategories.map((cat, idx) => (
              <Link key={idx} to="/sp/user" className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0 lg:flex-1">
                <div className={`text-2xl lg:text-3xl ${cat.color} transition-all duration-500 group-hover:scale-125`}>{cat.icon}</div>
                <span className="text-[9px] lg:text-[11px] font-black text-gray-400 group-hover:text-gray-900 transition-colors uppercase tracking-[0.1em] leading-none text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="relative pt-12 sm:pt-16 pb-16 sm:pb-24 overflow-hidden bg-white">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
              className="flex-1 text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-gray-900 leading-[1.1] sm:leading-[0.9] mb-6 sm:mb-8 tracking-tighter">
                Genuine Parts, <br /><span className="text-brand">Expert Repairs.</span>
              </h1>
              <p className="text-base sm:text-xl leading-relaxed text-gray-500 mb-8 sm:mb-10 max-w-xl font-medium italic">
                "Our parts. Our warranty. Your peace of mind."
              </p>
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 justify-center lg:justify-start items-center">
                <Link to="/sp/user" className="w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-gray-900 text-white rounded-2xl text-base sm:text-lg font-black flex items-center justify-center gap-3 hover:bg-brand transition-all">
                  Book Repair <FaArrowRight />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Join Platform */}
      <section id="join-platform" className="py-20 sm:py-32 bg-gray-900 rounded-[3rem] sm:rounded-[6rem] mx-2 sm:mx-8 mb-8 overflow-hidden relative">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="text-center mb-16 sm:mb-24 text-white">
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 tracking-tighter">Become a Part.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            {[
              { to: "/sp/user", icon: <FaUser />, title: "As a User", btn: "Book Service" },
              { to: "/sp/vendor/login", icon: <FaStore />, title: "Vendor Partner", btn: "Partner Now" },
              { to: "/sp/worker/login", icon: <FaHammer />, title: "As an Xpert", btn: "Start Earning" },
            ].map((box, idx) => (
              <Link key={idx} to={box.to} className="group p-8 sm:p-12 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] transition-all duration-700 hover:bg-white hover:shadow-2xl hover:-translate-y-2 flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 text-white rounded-[1.5rem] sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-10 transition-all duration-500 group-hover:bg-brand group-hover:text-white">
                  <div className="text-3xl sm:text-4xl">{box.icon}</div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-10 tracking-tighter text-white group-hover:text-gray-900">{box.title}</h3>
                <div className="flex items-center gap-3 text-brand font-black text-xs sm:text-sm uppercase tracking-widest group-hover:gap-5 transition-all">
                  {box.btn} <FaArrowRight />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 sm:py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl relative z-10 text-center">
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">
            © {new Date().getFullYear()} {settings?.companyName || 'Service Provider'}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
