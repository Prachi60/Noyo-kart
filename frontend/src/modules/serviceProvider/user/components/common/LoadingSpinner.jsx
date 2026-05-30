import React from 'react';
import { FiLoader } from 'react-icons/fi';
import { themeColors } from '@sp/theme';
import LogoLoader from './LogoLoader';

const LoadingSpinner = ({ fullScreen = true, message = 'Loading...' }) => {
  if (fullScreen) {
    return <LogoLoader />;
  }

  return <LogoLoader fullScreen={false} size="w-16 h-16" />;
};

export default LoadingSpinner;
