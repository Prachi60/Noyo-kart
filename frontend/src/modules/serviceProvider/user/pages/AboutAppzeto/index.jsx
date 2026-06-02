import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiUsers, FiShield, FiClock, FiAward, FiHeart, FiSmile, FiSmartphone } from 'react-icons/fi';
import { themeColors } from '../../../theme';
import { configService } from '../../../services/configService';

// Map icon string names to actual icon components
const iconMap = {
  FiUsers,
  FiShield,
  FiClock,
  FiAward,
  FiSmile,
  FiSmartphone,
  FiCheckCircle,
};

const defaultAboutData = {
  heroDescription: 'Your trusted partner for all home and personal care services.',
  missionTitle: 'Our Mission',
  missionDescription: 'Appzeto is a comprehensive service platform that connects you with verified, professional service providers for all your home and personal care needs. We offer a wide range of services to make your life easier and more convenient.',
  features: [
    { icon: 'FiUsers', title: 'Expert Service Providers', description: 'Verified and trained professionals for all your service needs' },
    { icon: 'FiShield', title: 'Safe & Secure', description: 'Your safety and security is our top priority' },
    { icon: 'FiClock', title: 'On-Time Service', description: 'Punctual service delivery at your convenience' },
    { icon: 'FiAward', title: 'Quality Assured', description: 'High-quality service with satisfaction guarantee' },
  ],
  stats: [
    { number: '10K+', label: 'Happy Customers' },
    { number: '500+', label: 'Service Partners' },
    { number: '4.8', label: 'App Rating' },
  ],
  howWeWork: [
    { title: 'Easy Booking', desc: "Book services in just a few taps. Select your preferred time slot and we'll handle the rest.", icon: 'FiSmartphone' },
    { title: 'Verified Professionals', desc: 'All our service providers are background verified, trained, and certified professionals.', icon: 'FiUsers' },
    { title: 'Quality Assurance', desc: 'We ensure high-quality service delivery with our Cover Promise for your peace of mind.', icon: 'FiAward' },
    { title: 'Customer Support', desc: 'Our dedicated support team is available 24/7 to assist you with any queries or concerns.', icon: 'FiShield' },
  ],
};

const AboutAppzeto = () => {
  const navigate = useNavigate();
  const [aboutData, setAboutData] = useState(defaultAboutData);
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '' });
  const [appName, setAppName] = useState('Appzeto');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await configService.getSettings();
        if (res.success && res.settings) {
          const { aboutUs, supportEmail, supportPhone, companyName } = res.settings;
          if (appName) setAppName(companyName || 'Appzeto');
          if (supportEmail || supportPhone) {
            setContactInfo({
              email: supportEmail || '',
              phone: supportPhone || '',
            });
          }
          if (aboutUs) {
            setAboutData({
              heroDescription: aboutUs.heroDescription || defaultAboutData.heroDescription,
              missionTitle: aboutUs.missionTitle || defaultAboutData.missionTitle,
              missionDescription: aboutUs.missionDescription || defaultAboutData.missionDescription,
              features: (aboutUs.features && aboutUs.features.length > 0) ? aboutUs.features : defaultAboutData.features,
              stats: (aboutUs.stats && aboutUs.stats.length > 0) ? aboutUs.stats : defaultAboutData.stats,
              howWeWork: (aboutUs.howWeWork && aboutUs.howWeWork.length > 0) ? aboutUs.howWeWork : defaultAboutData.howWeWork,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings for AboutAppzeto:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-4">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl font-bold text-black">About {appName}</h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.icon} 100%)`,
              boxShadow: '0 4px 20px rgba(0, 166, 166, 0.3)'
            }}>
            <span className="text-4xl font-bold text-white">{appName.charAt(0).toUpperCase()}</span>
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Welcome to {appName}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {aboutData.heroDescription}
          </p>
        </div>

        {/* Mission Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-black mb-4">{aboutData.missionTitle}</h3>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              {aboutData.missionDescription}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        {aboutData.stats && aboutData.stats.length > 0 && (
          <div className="mb-8 flex justify-between bg-gray-50 rounded-2xl p-5 border border-gray-100 divide-x divide-gray-200">
            {aboutData.stats.map((stat, idx) => (
              <div key={idx} className="flex-1 text-center px-2">
                <div className="text-xl font-bold text-black">{stat.number}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Key Features */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-black mb-4">Why Choose {appName}</h3>
          <div className="grid grid-cols-2 gap-4">
            {aboutData.features.map((feature, index) => {
              const IconComp = iconMap[feature.icon] || FiCheckCircle;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: 'rgba(0, 166, 166, 0.1)' }}>
                    <IconComp className="w-6 h-6" style={{ color: themeColors.button }} />
                  </div>
                  <h4 className="text-sm font-bold text-black mb-1">{feature.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* How We Work Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-black mb-4">How We Work</h3>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-5">
            <div className="space-y-4">
              {aboutData.howWeWork.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: themeColors.button }}>
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-black mb-1">{step.title}</h4>
                    <p className="text-xs text-gray-700">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-lg font-bold text-black mb-3">Get in Touch</h3>
            <p className="text-sm text-gray-700 mb-4">
              Have questions or feedback? We'd love to hear from you!
            </p>
            <div className="space-y-2">
              {contactInfo.email && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Email:</span> {contactInfo.email}
                </p>
              )}
              {contactInfo.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Phone:</span> {contactInfo.phone}
                </p>
              )}
              {!contactInfo.email && !contactInfo.phone && (
                <p className="text-sm text-gray-500 italic">Contact information not available.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutAppzeto;
