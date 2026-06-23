'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Droplets, Wind, Thermometer, Eye, Search, MapPin, Loader2 } from 'lucide-react';

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  condition: string;
  icon: string;
  city: string;
}

const MOCK_WEATHER: WeatherData = {
  temp: 34,
  feelsLike: 38,
  humidity: 62,
  windSpeed: 14,
  visibility: 8,
  condition: 'Partly Cloudy',
  icon: 'cloud-sun',
  city: 'New Delhi',
};

function getWeatherIcon(icon: string, size: number = 16) {
  const style = { width: size, height: size };
  switch (icon) {
    case 'sun': return <Sun style={style} />;
    case 'cloud-rain': return <CloudRain style={style} />;
    case 'cloud-snow': return <CloudSnow style={style} />;
    case 'cloud-lightning': return <CloudLightning style={style} />;
    default: return <Cloud style={style} />;
  }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>(MOCK_WEATHER);
  const [popupOpen, setPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCustomLoc, setIsCustomLoc] = useState(false);
  
  const ref = useRef<HTMLDivElement>(null);

  // Helper to fetch weather for a specific latitude, longitude, and city name
  const fetchWeatherForCoords = async (lat: number, lon: number, city: string) => {
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,visibility`
      );
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const current = weatherData.current_weather;
        
        // Find current hour index for relative humidity and visibility
        let index = 0;
        const now = new Date();
        const currentHourStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
        
        if (weatherData.hourly?.time) {
          const matchedIndex = weatherData.hourly.time.indexOf(currentHourStr);
          if (matchedIndex !== -1) {
            index = matchedIndex;
          } else {
            index = now.getHours(); // Fallback to current hour index (0-23)
          }
        }

        // Map weathercode to condition names and lucide icons
        let condition = 'Partly Cloudy';
        let icon = 'cloud';
        const code = current.weathercode;
        
        if (code === 0) {
          condition = 'Clear Sky';
          icon = 'sun';
        } else if (code >= 1 && code <= 3) {
          condition = 'Partly Cloudy';
          icon = 'cloud-sun';
        } else if (code >= 51 && code <= 67) {
          condition = 'Rainy';
          icon = 'cloud-rain';
        } else if (code >= 71 && code <= 77) {
          condition = 'Snowy';
          icon = 'cloud-snow';
        } else if (code >= 80 && code <= 82) {
          condition = 'Showers';
          icon = 'cloud-rain';
        } else if (code >= 95) {
          condition = 'Thunderstorm';
          icon = 'cloud-lightning';
        }

        setWeather({
          temp: Math.round(current.temperature),
          feelsLike: Math.round(current.temperature), // Open-Meteo doesn't provide apparent temp in standard current_weather, but we approximate
          humidity: weatherData.hourly?.relativehumidity_2m?.[index] ?? 62,
          windSpeed: Math.round(current.windspeed),
          visibility: Math.round((weatherData.hourly?.visibility?.[index] ?? 10000) / 1000), // convert to km
          condition,
          icon,
          city,
        });
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
    }
  };

  // Helper to run IP Geolocation detection
  const fetchLocalWeather = async () => {
    let lat = 28.6139; // Delhi coordinates
    let lon = 77.2090;
    let city = 'New Delhi';

    // Helper to get from backend IP proxy
    const getIPLocation = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL ||
          (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');
        const locRes = await fetch(`${API_URL}/api/location`);
        if (locRes.ok) {
          const locData = await locRes.json();
          if (locData.success) {
            return {
              lat: locData.latitude || 28.6139,
              lon: locData.longitude || 77.2090,
              city: locData.city || 'New Delhi'
            };
          }
        }
      } catch (err) {
        console.error('Backend location lookup failed:', err);
      }
      return null;
    };

    // Try HTML5 geolocation first (fast, accurate) if supported
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const getPosition = () => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 4000,
            maximumAge: 10 * 60 * 1000 // 10 minutes cache
          });
        });
      };

      try {
        const position = await getPosition();
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        
        // Reverse geocode coords using a free public API
        city = "Your Location";
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            city = revData.city || revData.locality || revData.principalSubdivision || "Your Location";
          }
        } catch (revErr) {
          console.warn("Reverse geocode failed, using default label", revErr);
        }
        await fetchWeatherForCoords(lat, lon, city);
        return;
      } catch (geoErr) {
        console.log('HTML5 Geolocation denied/failed, falling back to IP Geolocation proxy.');
      }
    }

    // IP Geolocation Fallback via backend proxy (to avoid CORS)
    const ipLoc = await getIPLocation();
    if (ipLoc) {
      lat = ipLoc.lat;
      lon = ipLoc.lon;
      city = ipLoc.city;
    }

    await fetchWeatherForCoords(lat, lon, city);
  };

  useEffect(() => {
    const initializeLocationAndWeather = async () => {
      const savedLoc = localStorage.getItem('weather_custom_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed.lat && parsed.lon && parsed.city) {
            setIsCustomLoc(true);
            await fetchWeatherForCoords(parsed.lat, parsed.lon, parsed.city);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached weather location:', e);
        }
      }
      await fetchLocalWeather();
    };

    initializeLocationAndWeather();
  }, []);

  // Handle City Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=1&language=en&format=json`
      );
      if (!res.ok) throw new Error('Geocoding request failed');
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        setErrorMsg('City not found');
        return;
      }
      const result = data.results[0];
      const newLoc = {
        city: result.name,
        lat: result.latitude,
        lon: result.longitude,
      };
      localStorage.setItem('weather_custom_location', JSON.stringify(newLoc));
      setIsCustomLoc(true);
      setSearchQuery('');
      await fetchWeatherForCoords(newLoc.lat, newLoc.lon, newLoc.city);
    } catch (err) {
      console.error(err);
      setErrorMsg('Search failed. Try again.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Detect current location (clear custom)
  const handleDetectLocation = async () => {
    localStorage.removeItem('weather_custom_location');
    setIsCustomLoc(false);
    setErrorMsg('');
    await fetchLocalWeather();
  };

  // Close popup on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPopupOpen(false);
      }
    }
    if (popupOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popupOpen]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Inline Display */}
      <button
        onClick={() => setPopupOpen(!popupOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 8px',
          borderRadius: 4,
          transition: 'background 0.15s',
          fontFamily: 'var(--font-sans)',
        }}
        title="Click for weather details"
      >
        {getWeatherIcon(weather.icon, 16)}
        <span>{weather.temp}°C</span>
        <span style={{ opacity: 0.6 }}>{weather.city}</span>
      </button>

      {/* Popup Dialog */}
      <div className={`weather-popup ${popupOpen ? 'open' : ''}`} style={{ width: 290 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 4 }}>
              Current Weather
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
              {weather.city}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {getWeatherIcon(weather.icon, 28)}
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}>
              {weather.temp}°
            </span>
          </div>
        </div>

        {/* Location Search Input */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              style={{
                width: '100%',
                padding: '6px 30px 6px 10px',
                fontSize: 12,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 6,
                color: 'var(--color-ink)',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loadingSearch}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--color-ink-muted)',
              }}
            >
              {loadingSearch ? (
                <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
              ) : (
                <Search style={{ width: 12, height: 12 }} />
              )}
            </button>
          </div>
          {/* Auto detect button */}
          <button
            onClick={handleDetectLocation}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              background: isCustomLoc ? 'var(--bg-tertiary)' : 'var(--ir-crimson-bg)',
              border: '1px solid var(--border-secondary)',
              borderRadius: 6,
              cursor: 'pointer',
              color: isCustomLoc ? 'var(--color-ink-muted)' : 'var(--ir-crimson)',
            }}
            title="Detect my location"
          >
            <MapPin style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ fontSize: 11, color: 'var(--ir-crimson)', marginBottom: 8, textAlign: 'left' }}>
            {errorMsg}
          </div>
        )}

        {/* Condition */}
        <div style={{
          fontSize: 13,
          color: 'var(--color-ink-muted)',
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border-secondary)',
        }}>
          {weather.condition}
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: <Thermometer style={{ width: 14, height: 14 }} />, label: 'Feels Like', value: `${weather.feelsLike}°C` },
            { icon: <Droplets style={{ width: 14, height: 14 }} />, label: 'Humidity', value: `${weather.humidity}%` },
            { icon: <Wind style={{ width: 14, height: 14 }} />, label: 'Wind', value: `${weather.windSpeed} km/h` },
            { icon: <Eye style={{ width: 14, height: 14 }} />, label: 'Visibility', value: `${weather.visibility} km` },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ir-crimson)',
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--border-secondary)',
          fontSize: 10,
          color: 'var(--color-ink-ghost)',
          textAlign: 'center',
        }}>
          Local weather detection is active
        </div>
      </div>
    </div>
  );
}
