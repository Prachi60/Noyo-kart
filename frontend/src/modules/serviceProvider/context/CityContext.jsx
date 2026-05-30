import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const CityContext = createContext();

export const useCity = () => useContext(CityContext);

export const CityProvider = ({ children }) => {
  const [currentCity, setCurrentCity] = useState(null);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initCity = async () => {
      try {
        setLoading(true);
        const response = await api.get('/public/cities');

        if (response.data.success && response.data.cities.length > 0) {
          const fetchedCities = response.data.cities;
          setCities(fetchedCities);

          const savedCityId = localStorage.getItem('spSelectedCityId');
          let selected = null;

          if (savedCityId) {
            selected = fetchedCities.find(c => c._id === savedCityId || c.id === savedCityId);
          }

          if (!selected) {
            selected = fetchedCities.find(c => c.isDefault) || fetchedCities[0];
          }

          setCurrentCity(selected);
          if (selected) {
            localStorage.setItem('spSelectedCityId', selected._id || selected.id);
          }
        }
      } catch (error) {
        console.error('Failed to load cities:', error);
      } finally {
        setLoading(false);
      }
    };

    initCity();
  }, []);

  const selectCity = (city) => {
    setCurrentCity(city);
    if (city) {
      localStorage.setItem('spSelectedCityId', city._id || city.id);
    } else {
      localStorage.removeItem('spSelectedCityId');
    }
  };

  const value = { currentCity, cities, selectCity, loading };

  return (
    <CityContext.Provider value={value}>
      {children}
    </CityContext.Provider>
  );
};
