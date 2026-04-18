import {
  checkoutPreviewSchema,
  createFinanceOrderSchema,
} from "../app/validation/financeValidation.js";

describe("finance validation for print orders", () => {
  const printPayload = {
    items: [
      {
        type: "print",
        name: "notes.pdf",
        quantity: 2,
        printDetails: {
          fileMetaId: "67f0000000000000000000aa",
          fileId: "print-file-public-id",
          pageCount: 6,
          options: {
            color: true,
            doubleSided: false,
          },
        },
      },
    ],
    sellerId: "67f0000000000000000000bb",
    address: {
      name: "Test User",
      address: "221B Baker Street",
      city: "Indore",
      location: { lat: 22.72, lng: 75.86 },
    },
    paymentMode: "COD",
  };

  test("checkout preview accepts print items without product ids", () => {
    const { error, value } = checkoutPreviewSchema.validate(printPayload, {
      abortEarly: false,
      stripUnknown: true,
    });

    expect(error).toBeUndefined();
    expect(value.items[0].type).toBe("print");
    expect(value.items[0].printDetails.pageCount).toBe(6);
    expect(value.sellerId).toBe("67f0000000000000000000bb");
  });

  test("create order schema accepts print items without product ids", () => {
    const { error, value } = createFinanceOrderSchema.validate(printPayload, {
      abortEarly: false,
      stripUnknown: true,
    });

    expect(error).toBeUndefined();
    expect(value.items).toHaveLength(1);
    expect(value.items[0].printDetails.fileMetaId).toBe("67f0000000000000000000aa");
  });
});
