import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { isUser } from '../../middleware/roleMiddleware.js';
import { getUserCart, addToCart, updateCartItem, removeFromCart, clearCart, removeCategoryItems } from '../../controllers/userControllers/userCartController.js';

const router = Router();

router.get('/', authenticate, isUser, getUserCart);
router.post('/', authenticate, isUser, addToCart);
router.put('/:itemId', authenticate, isUser, updateCartItem);
router.delete('/category/:category', authenticate, isUser, removeCategoryItems);
router.delete('/:itemId', authenticate, isUser, removeFromCart);
router.delete('/', authenticate, isUser, clearCart);

export default router;
