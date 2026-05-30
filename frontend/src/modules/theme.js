// Service Provider Theme Config (Shared at modules level)

export const userTheme = {
  primary: '#347989', // Teal-ish primary brand color
  button: '#347989',
  icon: '#347989',
  brand: {
    teal: '#347989',
    yellow: '#D68F35',
    orange: '#BB5F36',
    gradient: 'linear-gradient(135deg, #347989 0%, #1d4d57 100%)',
  },
  backgroundGradient: 'linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)',
};

export const workerTheme = {
  primary: '#10B981', // Emerald-ish for workers
  button: '#10B981',
  icon: '#10B981',
  brand: {
    teal: '#10B981',
    yellow: '#F59E0B',
    orange: '#F97316',
    gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
  },
  backgroundGradient: 'linear-gradient(180deg, #ECFDF5 0%, #D1FAE5 100%)',
};

export const vendorTheme = {
  primary: '#3B82F6', // Blue-ish for vendors
  button: '#3B82F6',
  icon: '#3B82F6',
  brand: {
    teal: '#3B82F6',
    yellow: '#F59E0B',
    orange: '#EF4444',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  },
  backgroundGradient: 'linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%)',
};

// themeColors alias
export const themeColors = userTheme;
