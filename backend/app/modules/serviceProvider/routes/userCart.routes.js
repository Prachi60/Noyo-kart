import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isUser } from '../middleware/roleMiddleware.js';
import {
  getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  removeCategoryItems,
  clearCart
} from '../controllers/userControllers/userCartController.js';

const router = Router();

router.get('/cart', authenticate, isUser, getUserCart);
router.post('/cart', authenticate, isUser, addToCart);
router.put('/cart/:itemId', authenticate, isUser, updateCartItem);
router.delete('/cart/:itemId', authenticate, isUser, removeFromCart);
router.delete('/cart/category/:category', authenticate, isUser, removeCategoryItems);
router.delete('/cart', authenticate, isUser, clearCart);

export default router;
