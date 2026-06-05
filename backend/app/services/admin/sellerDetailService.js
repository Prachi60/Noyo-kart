import Seller from "../../models/seller.js";
import Order from "../../models/order.js";
import Transaction from "../../models/transaction.js";

export const getSellerDetailData = async (sellerId) => {
  const seller = await Seller.findById(sellerId).lean();
  if (!seller) {
    throw new Error("Seller not found");
  }

  // Get total orders and revenue for this seller
  const orders = await Order.find({ seller: sellerId })
    .sort({ createdAt: -1 })
    .populate("customer", "name email");

  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (o.pricing?.total || 0), 0);

  // Get recent 10 orders for the table
  const recentOrders = orders.slice(0, 10).map((o) => ({
    id: o.orderId,
    customer: o.customer?.name || "Guest",
    status: o.status,
    amount: o.pricing?.total || 0,
    date: o.createdAt,
  }));

  // Get recent transactions for this seller (wallet or ledger)
  const transactions = await Transaction.find({ entityId: sellerId, entityType: "seller" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const recentTransactions = transactions.map((t) => ({
    id: t.transactionId || t._id.toString().slice(-8).toUpperCase(),
    type: t.type, // 'credit' or 'debit'
    desc: t.description || "Transaction",
    amount: t.amount,
    date: t.createdAt,
  }));

  return {
    id: seller._id,
    shopName: seller.shopName,
    ownerName: seller.name,
    email: seller.email,
    phone: seller.phone,
    category: seller.category || "General",
    rating: seller.rating || 4.5,
    status: seller.status || "active",
    joinedDate: seller.createdAt,
    location: seller.address || "Unknown",
    image: seller.logo || "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=200",
    walletBalance: seller.walletBalance || 0,
    totalOrders,
    totalRevenue,
    commissionRate: seller.commissionRate ? `${seller.commissionRate}%` : "10%",
    coords: seller.location || { lat: 19.076, lng: 72.8777 },
    serviceRadius: seller.serviceRadius || 5,
    bankInfo: seller.bankInfo || {
      bankName: "Pending Verification",
      accountNo: "XXXX",
      ifsc: "XXXX",
    },
    recentOrders,
    recentTransactions,
  };
};
