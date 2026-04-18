import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/authMiddleware.js";
import { 
  uploadAndDetect, 
  calculateQuote, 
  verifyAndGetFile 
} from "../controller/printController.js";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

router.post("/upload", verifyToken, upload.single("file"), uploadAndDetect);
router.post("/calculate", verifyToken, calculateQuote);
router.get("/verify/:orderId", verifyToken, verifyAndGetFile);

export default router;
