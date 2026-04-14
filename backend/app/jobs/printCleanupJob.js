import FileMeta from "../models/fileMeta.js";
import logger from "../services/logger.js";
import { deleteMedia } from "../services/mediaService.js";

/**
 * Job to delete orphaned print files that were uploaded but never placed in an order.
 * Condition: status === "ORPHAN" AND createdAt < now - 1 hour
 */
const cleanupOrphanedPrintFiles = async () => {
  const startTime = Date.now();
  try {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // Find orphaned files older than 1 hour
    const orphans = await FileMeta.find({
      status: "ORPHAN",
      createdAt: { $lt: oneHourAgo }
    });

    if (orphans.length === 0) {
      return;
    }

    logger.info(`Starting cleanup of ${orphans.length} orphaned print files`);

    for (const file of orphans) {
      try {
        // 1. Delete from Cloudinary/Storage
        await deleteMedia(file.publicId, file.ownerId, "Customer");
        
        // 2. Delete from Database
        await FileMeta.deleteOne({ _id: file._id });
        
        logger.debug(`Cleaned up orphaned file: ${file.publicId}`);
      } catch (err) {
        logger.error(`Failed to cleanup orphaned file ${file.publicId}:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    logger.info("Orphaned print files cleanup completed", {
      count: orphans.length,
      duration
    });
  } catch (error) {
    logger.error("Error in print cleanup job:", error.message);
  }
};

export const getPrintCleanupJobHandler = () => cleanupOrphanedPrintFiles;
export const getPrintCleanupJobInterval = () => 3600000; // Run every 1 hour

export default cleanupOrphanedPrintFiles;
