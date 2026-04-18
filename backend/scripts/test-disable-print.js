import mongoose from "mongoose";
import dotenv from "dotenv";
import Seller from "../app/models/seller.js";

dotenv.config();

async function disableAllPrintSellers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const result = await Seller.updateMany(
      {},
      { 
        $set: { 
          "services.print.enabled": false,
          "services.print.isConfigured": false
        } 
      }
    );

    console.log(`✅ Disabled print service for ${result.modifiedCount} sellers.`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

disableAllPrintSellers();
