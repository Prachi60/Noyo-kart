import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const getUserType = (path) => {
    if (path.startsWith('/sp/vendor')) return 'vendor';
    if (path.startsWith('/sp/worker')) return 'worker';
    if (path.startsWith('/sp/admin')) return 'admin';
    if (path.startsWith('/sp/user')) return 'user';
    return null;
  };

  const userType = getUserType(location.pathname);

  useEffect(() => {
    if (!userType) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    let tokenKey = 'spAccessToken';
    switch (userType) {
      case 'vendor': tokenKey = 'spVendorAccessToken'; break;
      case 'worker': tokenKey = 'spWorkerAccessToken'; break;
      case 'admin': tokenKey = 'spAdminAccessToken'; break;
      default: tokenKey = 'spAccessToken'; break;
    }

    const token = localStorage.getItem(tokenKey);
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    if (socket) socket.disconnect();

    const socketBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

    const newSocket = io(socketBaseUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      path: '/socket.io/',
      secure: true,
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (userType === 'vendor') {
        const vendorData = JSON.parse(localStorage.getItem('spVendorData') || '{}');
        const vendorId = vendorData.id || vendorData._id;
        if (vendorId) newSocket.emit('join_vendor_room', vendorId);
      }
    });

    newSocket.on('notification', (data) => {
      toast(data.message || 'New notification', { icon: '🔔', duration: 3500 });

      if (userType === 'worker') window.dispatchEvent(new Event('workerJobsUpdated'));
      if (userType === 'vendor') {
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorNotificationsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
      }
      if (userType === 'user') window.dispatchEvent(new Event('userBookingsUpdated'));
    });

    newSocket.on('booking_updated', (data) => {
      if (userType === 'user') window.dispatchEvent(new Event('userBookingsUpdated'));
      if (userType === 'vendor') window.dispatchEvent(new Event('vendorJobsUpdated'));
      if (userType === 'worker') window.dispatchEvent(new Event('workerJobsUpdated'));
    });

    if (userType === 'vendor') {
      newSocket.on('new_booking_request', (data) => {
        const newJob = {
          id: data.bookingId,
          serviceType: data.serviceName,
          customerName: data.customerName,
          status: 'requested',
          createdAt: data.createdAt || new Date().toISOString(),
          expiresAt: data.expiresAt
        };

        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
        const event = new CustomEvent('showDashboardBookingAlert', { detail: newJob });
        window.dispatchEvent(event);
      });

      newSocket.on('booking_taken', (data) => {
        toast.error(data.message || 'Job taken by another vendor', { icon: '⚡' });
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
      });
    }

    if (userType === 'worker') {
      newSocket.on('new_job_assigned', (data) => {
        const newJob = {
          id: data.bookingId,
          _id: data.bookingId,
          serviceType: data.serviceName || 'Service',
          status: 'ASSIGNED',
          createdAt: new Date().toISOString()
        };

        window.dispatchEvent(new Event('workerJobsUpdated'));
        const event = new CustomEvent('showWorkerJobAlert', { detail: newJob });
        window.dispatchEvent(event);
      });
    }

    return () => {
      newSocket.disconnect();
    };
  }, [userType]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
