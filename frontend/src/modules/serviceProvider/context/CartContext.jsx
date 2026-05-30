import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cartService } from '../services/cartService';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const path = window.location.pathname;
      if (path.startsWith('/sp/vendor') || path.startsWith('/sp/admin') || path.startsWith('/sp/worker')) {
        return;
      }

      const token = localStorage.getItem('spAccessToken');
      if (!token) {
        setCartItems([]);
        setCartCount(0);
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      const response = await cartService.getCart();
      if (response.success) {
        const items = response.data || [];
        setCartItems(items);
        setCartCount(items.length);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setCartItems([]);
        setCartCount(0);
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (itemData) => {
    const tempId = `temp-${Date.now()}`;
    const tempItem = { ...itemData, _id: tempId, id: tempId };

    setCartItems(prev => [...prev, tempItem]);
    setCartCount(prev => prev + 1);

    try {
      const response = await cartService.addToCart(itemData);
      if (response.success && response.data) {
        setCartItems(prev => prev.map(item =>
          item._id === tempId ? { ...item, ...response.data } : item
        ));
      } else {
        setCartItems(prev => prev.filter(item => item._id !== tempId));
        setCartCount(prev => Math.max(0, prev - 1));
      }
      return response;
    } catch (error) {
      setCartItems(prev => prev.filter(item => item._id !== tempId));
      setCartCount(prev => Math.max(0, prev - 1));
      throw error;
    }
  }, []);

  const updateItem = useCallback(async (itemId, serviceCount) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item._id === itemId || item.id === itemId) {
          const unitPrice = item.unitPrice || (item.serviceCount ? item.price / item.serviceCount : item.price);
          return { ...item, serviceCount, price: unitPrice * serviceCount };
        }
        return item;
      })
    );

    try {
      const response = await cartService.updateItem(itemId, serviceCount);
      if (response.success && response.data) {
        setCartItems(prev => prev.map(item => item._id === itemId ? response.data : item));
      } else {
        fetchCart();
      }
      return response;
    } catch (error) {
      fetchCart();
      throw error;
    }
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    setCartItems(prev => prev.filter(item => item._id !== itemId && item.id !== itemId));
    setCartCount(prev => Math.max(0, prev - 1));

    try {
      const response = await cartService.removeItem(itemId);
      if (!response.success) fetchCart();
      return response;
    } catch (error) {
      fetchCart();
      throw error;
    }
  }, [fetchCart]);

  const removeCategoryItems = useCallback(async (category) => {
    setCartItems(prev => {
      const filtered = prev.filter(item => item.category !== category);
      setCartCount(filtered.length);
      return filtered;
    });

    try {
      const response = await cartService.removeCategoryItems(category);
      if (!response.success) fetchCart();
      return response;
    } catch (error) {
      fetchCart();
      throw error;
    }
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    try {
      const response = await cartService.clearCart();
      if (response.success) {
        setCartItems([]);
        setCartCount(0);
      }
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  const resetCart = useCallback(() => {
    setCartItems([]);
    setCartCount(0);
    setIsInitialized(false);
  }, []);

  const value = {
    cartItems, cartCount, isLoading, isInitialized,
    fetchCart, addToCart, updateItem, removeItem,
    removeCategoryItems, clearCart, resetCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
