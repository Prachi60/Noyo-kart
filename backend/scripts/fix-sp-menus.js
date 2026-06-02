import mongoose from "mongoose";
import dotenv from "dotenv";
import SpSettings from "../app/modules/serviceProvider/models/SpSettings.js";

dotenv.config();

async function fixMenus() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const settings = await SpSettings.findOne({ type: 'global' });
        if (!settings) {
            console.log("Global SpSettings not found!");
            process.exit(1);
        }

        // We will force save to trigger Mongoose defaults for arrays if they are empty
        let updated = false;

        if (!settings.adminSidebarMenus || settings.adminSidebarMenus.length === 0) {
            settings.adminSidebarMenus = SpSettings.schema.path('adminSidebarMenus').defaultValue;
            updated = true;
        }
        
        if (!settings.adminBottomNavigation || settings.adminBottomNavigation.length === 0) {
            settings.adminBottomNavigation = SpSettings.schema.path('adminBottomNavigation').defaultValue;
            updated = true;
        }

        if (updated) {
            await settings.save();
            console.log("Fixed SpSettings menus successfully.");
        } else {
            console.log("Menus already populated.");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixMenus();
