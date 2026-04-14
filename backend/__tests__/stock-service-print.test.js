import { jest } from "@jest/globals";

const mockProductFindOneAndUpdate = jest.fn();
const mockStockHistoryCreate = jest.fn();
const mockProductUpdateOne = jest.fn();

jest.unstable_mockModule("../app/models/product.js", () => ({
  default: {
    findOneAndUpdate: mockProductFindOneAndUpdate,
    updateOne: mockProductUpdateOne,
  },
}));

jest.unstable_mockModule("../app/models/stockHistory.js", () => ({
  default: {
    create: mockStockHistoryCreate,
  },
}));

const {
  reserveStockForItems,
  releaseReservedStockForOrder,
} = await import("../app/services/stockService.js");

describe("stock service ignores print items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("reserveStockForItems no-ops for print items", async () => {
    await reserveStockForItems({
      items: [
        {
          type: "print",
          productId: null,
          productName: "notes.pdf",
          quantity: 2,
        },
      ],
      sellerId: "seller-1",
      orderId: "ORD-PRINT-1",
      session: null,
      paymentMode: "COD",
    });

    expect(mockProductFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mockStockHistoryCreate).not.toHaveBeenCalled();
  });

  test("releaseReservedStockForOrder no-ops for print items", async () => {
    const order = {
      _id: "order-1",
      orderId: "ORD-PRINT-1",
      seller: "seller-1",
      stockReservation: { status: "RESERVED" },
      items: [
        {
          type: "print",
          product: null,
          quantity: 1,
        },
      ],
    };

    const changed = await releaseReservedStockForOrder(order, {});

    expect(changed).toBe(true);
    expect(mockProductUpdateOne).not.toHaveBeenCalled();
    expect(mockStockHistoryCreate).not.toHaveBeenCalled();
    expect(order.stockReservation.status).toBe("RELEASED");
  });
});
