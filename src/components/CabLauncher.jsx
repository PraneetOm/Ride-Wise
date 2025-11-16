// CabLauncher.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const CabLauncher = ({ drop }) => {
  const [isMobile, setIsMobile] = useState(false);

  // ✅ Detect if mobile device
  useEffect(() => {
    const checkMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  // 🚖 Cab app configuration
  const cabApps = [
    {
      name: "Uber",
      logo: "/uber.png",
      deeplink:
        "https://m.uber.com/looking",
      fallback: "https://play.google.com/store/apps/details?id=com.ubercab",
      fallback_pc: "https://m.uber.com/looking",
    },
    {
      name: "Ola",
      logo: "/ola-cabs-logo.png",
      deeplink:
        "olacabs://app/launch?lat={pickup_lat}&lng={pickup_lng}&drop_lat={drop_lat}&drop_lng={drop_lng}",
      fallback: "https://play.google.com/store/apps/details?id=com.olacabs.customer",
      fallback_pc: "https://book.olacabs.com",
    },
    {
      name: "Rapido",
      logo: "/Rapido-logo.png",
      deeplink:
        "rapido://ride?pickup_lat={pickup_lat}&pickup_lng={pickup_lng}&drop_lat={drop_lat}&drop_lng={drop_lng}",
      fallback: "https://play.google.com/store/apps/details?id=com.rapido.passenger",
      fallback_pc: "https://www.rapido.bike/",
    },
  ];

    const openApp = (app) => {
    if (!isMobile) {
      window.open(app.fallback_pc, "_blank");
      return;
    }

    let hidden = false;

    // Detect if user switched away (app opened)
    const handleVisibilityChange = () => {
      if (document.hidden) hidden = true;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Try to open the app
    window.location.href = app.deeplink;

    // Fallback only if the app didn’t open (page still visible)
    setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (!hidden) {
        window.location.href = app.fallback;
      }
    }, 3500);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-md border mt-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <MapPin size={20} /> Compare Ride Options
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
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CabLauncher;




