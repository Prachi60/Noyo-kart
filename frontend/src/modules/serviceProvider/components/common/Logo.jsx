import React from 'react';
import LogoImage from '@/assets/Logo.png';

const Logo = ({ className }) => {
  return (
    <div className="flex items-center gap-2">
      <img 
        src={LogoImage} 
        alt="Noyo Logo" 
        className={className || "h-10 w-auto object-contain"} 
        loading="lazy"
      />
    </div>
  );
};

export default Logo;
