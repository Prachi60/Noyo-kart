import { jest } from "@jest/globals";

const mockOrderFindOne = jest.fn();
const mockOrderFindById = jest.fn();
const mockSellerAcceptAtomic = jest.fn();
const mockSellerRejectAtomic = jest.fn();
const mockHandleResponse = jest.fn();
const mockOrderMatchQueryFromRouteParam = jest.fn();

jest.unstable_mockModule("../app/models/order.js", () => ({
  default: {
    findOne: mockOrderFindOne,
    findById: mockOrderFindById,
  },
}));

jest.unstable_mockModule("../app/models/cart.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/product.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/transaction.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/stockHistory.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/notification.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/seller.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/delivery.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/setting.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/customer.js", () => ({ default: {} }));

jest.unstable_mockModule("../app/services/orderSettlement.js", () => ({
  applyDeliveredSettlement: jest.fn(),
}));

jest.unstable_mockModule("../app/utils/orderLookup.js", () => ({
  orderMatchQueryFromRouteParam: mockOrderMatchQueryFromRouteParam,
  orderMatchQueryFlexible: jest.fn(),
}));

jest.unstable_mockModule("../app/utils/helper.js", () => ({
  default: mockHandleResponse,
}));

jest.unstable_mockModule("../app/utils/pagination.js", () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule("../app/constants/orderWorkflow.js", () => ({
  WORKFLOW_STATUS: {},
  DEFAULT_SELLER_TIMEOUT_MS: () => 0,
  legacyStatusFromWorkflow: jest.fn((status) => status),
}));

jest.unstable_mockModule("../app/services/orderWorkflowService.js", () => ({
  afterPlaceOrderV2: jest.fn(),
  sellerAcceptAtomic: mockSellerAcceptAtomic,
  sellerRejectAtomic: mockSellerRejectAtomic,
  deliveryAcceptAtomic: jest.fn(),
  customerCancelV2: jest.fn(),
  resolveWorkflowStatus: jest.fn(),
}));

jest.unstable_mockModule("../app/services/finance/orderFinanceService.js", () => ({
  freezeFinancialSnapshot: jest.fn((order) => order),
  reverseOrderFinanceOnCancellation: jest.fn(),
}));

jest.unstable_mockModule("../app/utils/geoUtils.js", () => ({
  distanceMeters: jest.fn(),
}));

const { updateOrderStatus } = await import("../app/controller/orderController.js");

describe("updateOrderStatus seller workflow v2 guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderMatchQueryFromRouteParam.mockImplementation((id) => ({ orderId: id }));
    mockHandleResponse.mockImplementation((_res, status, message, data) => ({
      status,
      message,
      data,
    }));
  });

  it("rejects direct seller transition to delivery stages for workflow v2 orders", async () => {
    const orderDoc = {
      _id: "mongo-guard-1",
      orderId: "ORD-V2-1",
      status: "confirmed",
      orderStatus: "confirmed",
      workflowVersion: 2,
      seller: { toString: () => "seller-1" },
      save: jest.fn(),
    };

    mockOrderFindOne.mockResolvedValue(orderDoc);

    const req = {
      params: { orderId: "ORD-V2-1" },
      body: { status: "packed" },
      user: { id: "seller-1", role: "seller" },
    };

    const result = await updateOrderStatus(req, {});

    expect(result.status).toBe(409);
    expect(result.message).toBe("Seller cannot directly update delivery stages for workflow orders.");
    expect(orderDoc.save).not.toHaveBeenCalled();
    expect(mockSellerAcceptAtomic).not.toHaveBeenCalled();
    expect(mockSellerRejectAtomic).not.toHaveBeenCalled();
  });

  it("still allows seller accept through the atomic workflow path", async () => {
    const orderDoc = {
      _id: "mongo-guard-2",
      orderId: "ORD-V2-2",
      status: "pending",
      orderStatus: "pending",
      workflowVersion: 2,
      seller: { toString: () => "seller-1" },
      save: jest.fn(),
    };

    const updatedOrder = { orderId: "ORD-V2-2", workflowStatus: "DELIVERY_SEARCH" };
    mockOrderFindOne.mockResolvedValue(orderDoc);
    mockSellerAcceptAtomic.mockResolvedValue(updatedOrder);

    const req = {
      params: { orderId: "ORD-V2-2" },
      body: { status: "confirmed" },
      user: { id: "seller-1", role: "seller" },
    };

    const result = await updateOrderStatus(req, {});

    expect(result.status).toBe(200);
    expect(result.message).toBe("Order accepted");
    expect(result.data).toBe(updatedOrder);
    expect(mockSellerAcceptAtomic).toHaveBeenCalledWith("seller-1", "ORD-V2-2");
    expect(orderDoc.save).not.toHaveBeenCalled();
  });
});
