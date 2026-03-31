/** Default fallbacks when settings are not yet loaded or API fails */
export const DEFAULT_SETTINGS = {
  appName: "App",
  supportEmail: "",
  supportPhone: "",
  currencySymbol: "\u20B9",
  currencyCode: "INR",
  timezone: "Asia/Kolkata",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#45B0E2",
  secondaryColor: "#64748b",
  companyName: "",
  taxId: "",
  address: "",
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
  youtube: "",
  playStoreLink: "",
  appStoreLink: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  keywords: [],
  returnDeliveryCommission: 0,
  deliveryPricingMode: "distance_based",
  pricingMode: "distance_based",
  customerBaseDeliveryFee: 30,
  riderBasePayout: 30,
  baseDeliveryCharge: 30,
  baseDistanceCapacityKm: 0.5,
  incrementalKmSurcharge: 10,
  deliveryPartnerRatePerKm: 5,
  fleetCommissionRatePerKm: 5,
  fixedDeliveryFee: 30,
  handlingFeeStrategy: "highest_category_fee",
  codEnabled: true,
  onlineEnabled: true,
};

/**
 * Applies theme CSS variables to document root from settings.
 */
export function applyThemeVariables(settings) {
  if (!settings) return;
  const root = document.documentElement;
  const primary = settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const secondary = settings.secondaryColor || DEFAULT_SETTINGS.secondaryColor;
  
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--primary-color", primary);
  root.style.setProperty("--secondary-color", secondary);
}
