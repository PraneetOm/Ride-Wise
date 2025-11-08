// CabLauncher.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const CabLauncher = ({ drop }) => {
  const [pickup, setPickup] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ Detect if mobile device
  useEffect(() => {
    const checkMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  // ✅ Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickup({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.error("Location error:", err);
          alert("Please allow location access to use ride apps.");
        }
      );
    }
  }, []);

  // 🚖 Cab app configuration
  const cabApps = [
    {
      name: "Uber",
      logo: "../public/uber.png",
      deeplink:
        "uber://?action=setPickup&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&dropoff[latitude]={drop_lat}&dropoff[longitude]={drop_lng}",
      fallback: "https://play.google.com/store/apps/details?id=com.ubercab",
    },
    {
      name: "Ola",
      logo: "../public/ola-cabs-logo.png",
      deeplink:
        "olacabs://app/launch?lat={pickup_lat}&lng={pickup_lng}&drop_lat={drop_lat}&drop_lng={drop_lng}",
      fallback: "https://play.google.com/store/apps/details?id=com.olacabs.customer",
    },
    {
      name: "Rapido",
      logo: "../public/Rapido-logo.png",
      deeplink:
        "rapido://ride?pickup_lat={pickup_lat}&pickup_lng={pickup_lng}&drop_lat={drop_lat}&drop_lng={drop_lng}",
      fallback: "https://play.google.com/store/apps/details?id=com.rapido.passenger",
    },
  ];

  const openApp = (app) => {
    if (!pickup) {
      alert("Fetching your location...");
      return;
    }

    if (!isMobile) {
      alert("This feature works only on mobile devices.");
      return;
    }

    const deeplink = app.deeplink
      .replace("{pickup_lat}", pickup.lat)
      .replace("{pickup_lng}", pickup.lng)
      .replace("{drop_lat}", drop.lat)
      .replace("{drop_lng}", drop.lng);

    // Try opening the deep link
    window.location.href = deeplink;

    // Fallback to Play Store after short delay
    setTimeout(() => {
      window.location.href = app.fallback;
    }, 1500);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-md border mt-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <MapPin size={20} /> Compare & Book Rides
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {cabApps.map((app, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openApp(app)}
            className="flex flex-col items-center bg-gray-50 rounded-xl p-3 cursor-pointer hover:shadow-lg transition"
          >
            <img src={app.logo} alt={app.name} className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">{app.name}</p>
            <p className="text-xs text-gray-400">Open in App</p>
          </motion.div>
        ))}
      </div>

      {!pickup && (
        <p className="text-xs text-gray-500 mt-3">
          📍 Fetching your current location...
        </p>
      )}
    </div>
  );
};

export default CabLauncher;