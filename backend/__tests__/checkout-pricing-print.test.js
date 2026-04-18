import { jest } from "@jest/globals";

const mockSellerFindById = jest.fn();
const mockFileMetaFindById = jest.fn();
const mockFileMetaFindOne = jest.fn();
const mockGetOrCreateFinanceSettings = jest.fn();

function createQueryChain(result) {
  return {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    session: jest.fn().mockReturnThis(),
  };
}

jest.unstable_mockModule("../app/models/seller.js", () => ({
  default: {
    findById: mockSellerFindById,
  },
}));

jest.unstable_mockModule("../app/models/fileMeta.js", () => ({
  default: {
    findById: mockFileMetaFindById,
    findOne: mockFileMetaFindOne,
  },
}));

jest.unstable_mockModule("../app/services/finance/financeSettingsService.js", () => ({
  getOrCreateFinanceSettings: mockGetOrCreateFinanceSettings,
}));

const { buildCheckoutPricingSnapshot } = await import(
  "../app/services/checkoutPricingService.js"
);

describe("checkout pricing snapshot for print orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSellerFindById.mockImplementation(() =>
      createQueryChain({
        _id: "seller-print-1",
        shopName: "Print Hub",
        serviceRadius: 10,
        isOnline: true,
        isAcceptingOrders: true,
        location: {
          coordinates: [75.86, 22.72],
        },
        services: {
          print: {
            enabled: true,
            isConfigured: true,
            rates: {
              bw: 2,
              color: 5,
              doubleSidedExtra: 1,
            },
          },
        },
      }),
    );

    mockFileMetaFindById.mockImplementation(() =>
      createQueryChain({
        _id: "file-meta-1",
        ownerId: "customer-1",
        publicId: "print-public-id-1",
        fileUrl: "https://cdn.example.com/file.pdf",
        status: "ORPHAN",
      }),
    );

    mockFileMetaFindOne.mockImplementation(() => createQueryChain(null));
    mockGetOrCreateFinanceSettings.mockResolvedValue({
      deliveryPricingMode: "distance_based",
      customerBaseDeliveryFee: 12,
      riderBasePayout: 8,
      baseDistanceCapacityKm: 1,
      incrementalKmSurcharge: 4,
      deliveryPartnerRatePerKm: 2,
      fixedDeliveryFee: 50,
      handlingFeeStrategy: "highest_category_fee",
      codEnabled: true,
      onlineEnabled: true,
    });
  });

  test("builds authoritative pricing for print checkout from finance settings", async () => {
    const snapshot = await buildCheckoutPricingSnapshot({
      orderItems: [
        {
          type: "print",
          name: "notes.pdf",
          quantity: 2,
          printDetails: {
            fileMetaId: "file-meta-1",
            fileId: "print-public-id-1",
            pageCount: 3,
            options: {
              color: true,
              doubleSided: true,
            },
          },
        },
      ],
      sellerId: "seller-print-1",
      customerId: "customer-1",
      address: {
        location: { lat: 22.7205, lng: 75.8605 },
      },
    });

    expect(snapshot.sellerCount).toBe(1);
    expect(snapshot.itemCount).toBe(2);
    expect(snapshot.aggregateBreakdown.productSubtotal).toBe(32);
    expect(snapshot.aggregateBreakdown.deliveryFeeCharged).toBe(12);
    expect(snapshot.aggregateBreakdown.handlingFeeCharged).toBe(0);
    expect(snapshot.aggregateBreakdown.grandTotal).toBe(44);
    expect(snapshot.sellerBreakdownEntries[0].items[0].printDetails.fileMetaId).toBe("file-meta-1");
    expect(snapshot.aggregateBreakdown.snapshots.perSeller[0].snapshots.deliverySettings.customerBaseDeliveryFee).toBe(12);
  });
});
