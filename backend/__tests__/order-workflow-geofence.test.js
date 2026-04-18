import { jest } from "@jest/globals";

const mockOrderFindOne = jest.fn();
const mockOrderFindOneAndUpdate = jest.fn();
const mockSellerFindById = jest.fn();
const mockDistanceMeters = jest.fn();

jest.unstable_mockModule("../app/models/order.js", () => ({
  default: {
    findOne: mockOrderFindOne,
    findOneAndUpdate: mockOrderFindOneAndUpdate,
  },
}));

jest.unstable_mockModule("../app/models/deliveryAssignment.js", () => ({
  default: { create: jest.fn(), findOne: jest.fn() },
}));

jest.unstable_mockModule("../app/models/orderOtp.js", () => ({
  default: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    hashCode: jest.fn((value) => value),
  },
}));

jest.unstable_mockModule("../app/models/seller.js", () => ({
  default: {
    findById: mockSellerFindById,
  },
}));

jest.unstable_mockModule("../app/services/orderCompensation.js", () => ({
  compensateOrderCancellation: jest.fn(),
}));

jest.unstable_mockModule("../app/queues/orderQueues.js", () => ({
  sellerTimeoutQueue: { add: jest.fn(), getJob: jest.fn() },
  deliveryTimeoutQueue: { add: jest.fn(), getJob: jest.fn() },
  JOB_NAMES: {},
}));

jest.unstable_mockModule("../app/config/redis.js", () => ({
  getRedisClient: jest.fn(() => null),
}));

jest.unstable_mockModule("../app/services/orderSocketEmitter.js", () => ({
  emitOrderStatusUpdate: jest.fn(),
  emitToSeller: jest.fn(),
  emitDeliveryBroadcastForSeller: jest.fn(),
  emitToCustomer: jest.fn(),
  retractDeliveryBroadcastForOrder: jest.fn(),
}));

jest.unstable_mockModule("../app/utils/geoUtils.js", () => ({
  distanceMeters: mockDistanceMeters,
}));

jest.unstable_mockModule("../app/services/orderSettlement.js", () => ({
  applyDeliveredSettlement: jest.fn(),
}));

jest.unstable_mockModule("../app/utils/orderLookup.js", () => ({
  requireCanonicalOrderId: jest.fn(async (orderId) => orderId),
}));

jest.unstable_mockModule("../app/modules/notifications/notification.emitter.js", () => ({
  emitNotificationEvent: jest.fn(),
}));

jest.unstable_mockModule("../app/modules/notifications/notification.constants.js", () => ({
  NOTIFICATION_EVENTS: {
    ORDER_PACKED: "ORDER_PACKED",
    ORDER_READY: "ORDER_READY",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  },
}));

const {
  markArrivedAtStoreAtomic,
  confirmPickupAtomic,
} = await import("../app/services/orderWorkflowService.js");

function mockSellerLocation(lat = 22.721309, lng = 75.800043) {
  mockSellerFindById.mockReturnValue({
    select: () => ({
      lean: async () => ({
        location: {
          coordinates: [lng, lat],
        },
      }),
    }),
  });
}

describe("order workflow geofence enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSellerLocation();
  });

  it("blocks markArrivedAtStoreAtomic when rider is outside pickup radius", async () => {
    mockOrderFindOne.mockResolvedValue({
      orderId: "ORD-GEO-1",
      seller: "seller-1",
      deliveryBoy: "delivery-1",
      workflowVersion: 2,
      workflowStatus: "DELIVERY_ASSIGNED",
    });
    mockDistanceMeters.mockReturnValue(251);

    await expect(
      markArrivedAtStoreAtomic("delivery-1", "ORD-GEO-1", 22.72, 75.8),
    ).rejects.toMatchObject({
      message: "Too far from store (>150m)",
      statusCode: 400,
    });

    expect(mockOrderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("allows markArrivedAtStoreAtomic when rider is within pickup radius", async () => {
    const updated = { orderId: "ORD-GEO-2", workflowStatus: "PICKUP_READY" };
    mockOrderFindOne.mockResolvedValue({
      orderId: "ORD-GEO-2",
      seller: "seller-1",
      deliveryBoy: "delivery-1",
      workflowVersion: 2,
      workflowStatus: "DELIVERY_ASSIGNED",
    });
    mockDistanceMeters.mockReturnValue(75);
    mockOrderFindOneAndUpdate.mockResolvedValue(updated);

    const result = await markArrivedAtStoreAtomic("delivery-1", "ORD-GEO-2", 22.72, 75.8);

    expect(result).toBe(updated);
    expect(mockOrderFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("blocks confirmPickupAtomic when rider is outside pickup radius", async () => {
    mockOrderFindOne.mockResolvedValue({
      orderId: "ORD-GEO-3",
      seller: "seller-1",
      deliveryBoy: "delivery-1",
      workflowVersion: 2,
      workflowStatus: "PICKUP_READY",
    });
    mockDistanceMeters.mockReturnValue(300);

    await expect(
      confirmPickupAtomic("delivery-1", "ORD-GEO-3", 22.72, 75.8),
    ).rejects.toMatchObject({
      message: "Too far from store (>150m)",
      statusCode: 400,
    });

    expect(mockOrderFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("allows confirmPickupAtomic when rider is within pickup radius", async () => {
    const updated = { orderId: "ORD-GEO-4", workflowStatus: "OUT_FOR_DELIVERY" };
    mockOrderFindOne.mockResolvedValue({
      orderId: "ORD-GEO-4",
      seller: "seller-1",
      deliveryBoy: "delivery-1",
      workflowVersion: 2,
      workflowStatus: "PICKUP_READY",
    });
    mockDistanceMeters.mockReturnValue(120);
    mockOrderFindOneAndUpdate.mockResolvedValue(updated);

    const result = await confirmPickupAtomic("delivery-1", "ORD-GEO-4", 22.72, 75.8);

    expect(result).toBe(updated);
    expect(mockOrderFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});
