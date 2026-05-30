import React from 'react';

const LogoLoader = ({ fullScreen = true, inline = false, size = 'w-10 h-10' }) => {
  if (inline) {
    return (
      <div className={`${size} border-2 border-white/30 border-t-white rounded-full animate-spin`} />
    );
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-[#10B981] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-[#10B981] rounded-full animate-spin" />
    </div>
  );
};

export default LogoLoader;
