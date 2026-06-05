import User from "../../models/customer.js";
import Seller from "../../models/seller.js";
import Delivery from "../../models/delivery.js";
import Order from "../../models/order.js";
import Product from "../../models/product.js";

const DASHBOARD_CATEGORY_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444"];

export async function getAdminDashboardStats() {
  const [totalCustomers, totalSellers, totalRiders, totalOrders] =
    await Promise.all([
      User.countDocuments({ role: "user" }),
      Seller.countDocuments(),
      Delivery.countDocuments(),
      Order.countDocuments(),
    ]);

  const totalUsers = totalCustomers;
  const activeSellers = await Seller.countDocuments({ isVerified: true });

  const revenueData = await Order.aggregate([
    { $match: { status: "delivered" } },
    { $group: { _id: null, total: { $sum: "$pricing.total" } } },
  ]);
  const totalRevenue = revenueData[0]?.total || 0;

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const historyAggregation = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfYear }, status: "delivered" } },
    {
      $group: {
        _id: { $month: "$createdAt" },
        revenue: { $sum: "$pricing.total" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = {};
  
  for (let i = 1; i <= 12; i++) {
    monthlyData[i] = {
      name: monthNames[i - 1],
      revenue: 0,
    };
  }

  historyAggregation.forEach((item) => {
    if (monthlyData[item._id]) {
      monthlyData[item._id].revenue = item.revenue;
    }
  });

  const revenueHistory = Object.values(monthlyData);

  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("customer", "name");

  const categoryData = await Product.aggregate([
    { $group: { _id: "$headerId", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    { $project: { name: "$category.name", value: "$count" } },
    { $limit: 4 },
  ]);

  const topProducts = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        sales: { $sum: "$items.quantity" },
        revenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
      },
    },
    { $sort: { sales: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.name",
        sales: 1,
        rev: "$revenue",
        image: "$product.mainImage",
      },
    },
  ]);

  // Calculate real growth: last 30 days vs previous 30 days (rolling window)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [last30Orders, prev30Orders] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Order.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
  ]);

  let categoryGrowth = 0;
  if (prev30Orders === 0 && last30Orders > 0) {
    categoryGrowth = 100;
  } else if (prev30Orders > 0) {
    categoryGrowth = Math.round(((last30Orders - prev30Orders) / prev30Orders) * 100);
  }

  return {
    overview: {
      totalUsers,
      activeSellers,
      totalOrders,
      totalRevenue,
    },
    revenueHistory,
    categoryGrowth,
    recentOrders: recentOrders.map((order) => ({
      id: order.orderId,
      customer: order.customer?.name || "Guest",
      statusText: order.status,
      status:
        order.status === "delivered"
          ? "success"
          : order.status === "cancelled"
            ? "error"
            : "warning",
      amount: `\u20B9${order.pricing.total}`,
      time: "Recently",
    })),
    categoryData: categoryData.map((category, index) => ({
      ...category,
      color: DASHBOARD_CATEGORY_COLORS[index % DASHBOARD_CATEGORY_COLORS.length],
    })),
    topProducts: topProducts.map((product) => ({
      name: product.name,
      sales: product.sales,
      rev: `\u20B9${product.rev.toFixed(2)}`,
      trend: "+5%",
      cat: "Product",
      image: product.image,
      icon: "\u{1F4E6}", // Fallback package icon
      color: "bg-blue-50 text-blue-600",
    })),
  };
}
