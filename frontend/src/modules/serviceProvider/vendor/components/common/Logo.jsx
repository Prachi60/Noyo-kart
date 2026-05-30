import React from 'react';
import LogoImage from '@/assets/Logo.png';

const Logo = ({ className }) => {
  return (
    <img
      src={LogoImage}
      alt="Noyo Logo"
      className={className || 'h-10 w-auto object-contain'}
      loading="lazy"
    />
  );
};

export default Logo;
