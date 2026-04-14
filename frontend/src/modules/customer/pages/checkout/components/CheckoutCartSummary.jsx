import React from "react";
import { Plus, Minus } from "lucide-react";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

const getPrintDetails = (item) =>
  Array.isArray(item?.printDetails)
    ? item.printDetails[0] || null
    : item?.printDetails || {
        pageCount: item?.pageCount,
        copies: item?.copies,
        options: {
          color: Boolean(item?.isColor),
          doubleSided: Boolean(item?.isDoubleSided),
        },
      };

/**
 * CheckoutCartSummary
 *
 * Props:
 *   cart              – array of cart items
 *   onUpdateQuantity  – (id, delta, variantSku) => void
 *   onRemoveFromCart  – (id, variantSku) => void
 *   onMoveToWishlist  – (item) => void
 *   showAll           – boolean (currently unused — all items shown)
 *   onToggleShowAll   – () => void
 */
const CheckoutCartSummary = React.memo(function CheckoutCartSummary({
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onMoveToWishlist,
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
      {cart.map((item) => (
        <div
          key={`${item.id || item.publicId || item.name}::${String(item.variantSku || "").trim()}`}
          className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
          <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
            <img
              src={applyCloudinaryTransform(item.image)}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 mb-1">{item.name}</h4>
            {item.type === "print" ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {getPrintDetails(item)?.options?.color ? "Color" : "B&W"}
                  </span>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {getPrintDetails(item)?.pageCount || 0} Pages
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  {getPrintDetails(item)?.options?.doubleSided ? "Double Sided" : "Single Sided"}
                </p>
              </div>
            ) : (item.variantName || item.variantSku) && (
              <p className="text-xs text-slate-500 mb-1">
                Variant: {item.variantName || item.variantSku}
              </p>
            )}
            {item.type !== "print" && (
              <button
                onClick={() => onMoveToWishlist(item)}
                className="text-xs text-slate-500 underline hover:text-[#45B0E2] transition-colors">
                Move to wishlist
              </button>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {item.type === "print" ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Copies:
                </span>
                <span className="text-sm font-black text-slate-900">
                  {item.quantity || item.copies || getPrintDetails(item)?.copies || 1}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#45B0E2] rounded-lg px-2 py-1">
                <button
                  onClick={() =>
                    item.quantity > 1
                      ? onUpdateQuantity(item.id, -1, item.variantSku)
                      : onRemoveFromCart(item.id, item.variantSku)
                  }
                  className="text-white p-1 hover:bg-white/20 rounded transition-colors">
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="text-white font-bold min-w-[20px] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1, item.variantSku)}
                  className="text-white p-1 hover:bg-white/20 rounded transition-colors">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            )}
            {(() => {
              const mrp = Number(item.price || 0);
              const sale = Number(item.salePrice || 0);
              const qty = Math.max(0, Number(item.quantity || 0));
              const hasDiscount =
                Number.isFinite(mrp) &&
                Number.isFinite(sale) &&
                sale > 0 &&
                sale < mrp;
              const unit = hasDiscount ? sale : mrp;
              const total = Math.round(unit * qty);
              const totalMrp = Math.round(mrp * qty);
              return (
                <div className="text-right leading-tight">
                  <p className="text-base font-black text-slate-800">₹{total}</p>
                  {hasDiscount && (
                    <p className="text-[11px] font-bold text-slate-400 line-through">
                      ₹{totalMrp}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
});

export default CheckoutCartSummary;
