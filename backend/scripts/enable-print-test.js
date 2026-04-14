import mongoose from "mongoose";
import dotenv from "dotenv";
import Seller from "../app/models/seller.js";

dotenv.config();

async function enableTestPrintSeller() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    // Find any seller or create a dummy one
    let seller = await Seller.findOne();

    if (!seller) {
      console.log("No sellers found. Please register a seller first.");
      process.exit(1);
    }

    console.log(`Found seller: ${seller.shopName} (${seller.email})`);

    // Enable print service
    seller.services = {
      print: {
        enabled: true,
        isConfigured: true,
        rates: {
          bw: 2,           // ₹2 per page
          color: 10,       // ₹10 per page
          doubleSidedExtra: 1 // ₹1 extra for double sided
        }
      }
    };

    // Ensure seller is online and active
    seller.isOnline = true;
    seller.isAcceptingOrders = true;
    seller.isVerified = true;
    seller.isActive = true;

    // Set location to match the user's test coordinates if you want it to be "nearby"
    // User is at 22.711, 75.900
    seller.location = {
      type: "Point",
      coordinates: [75.9001, 22.7111] 
    };

    await seller.save();
    console.log("✅ Seller updated successfully for Print Testing!");
    console.log("-----------------------------------------");
    console.log(`Shop: ${seller.shopName}`);
    console.log(`Rates: B&W: ₹${seller.services.print.rates.bw}, Color: ₹${seller.services.print.rates.color}`);
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Error updating seller:", error);
    process.exit(1);
  }
}

enableTestPrintSeller();
