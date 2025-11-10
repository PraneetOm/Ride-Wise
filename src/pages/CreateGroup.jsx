import { useEffect, useState, useRef } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const [startLoc, setStartLoc] = useState("");
  const [endLoc, setEndLoc] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const navigate = useNavigate();

  const startBoxRef = useRef(null);
  const endBoxRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const GEOAPIFY_KEY = "110deec76066472b8c8d376e57074323";

  // ---------- AUTOCOMPLETE HANDLER ----------
  const handleSearch = async (value, type) => {
    if (!value.trim()) return;

    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          value
        )}&limit=5&apiKey=${GEOAPIFY_KEY}`
      );
      const data = await res.json();

      if (type === "start") setStartSuggestions(data.features || []);
      else setEndSuggestions(data.features || []);
    } catch (err) {
      console.error("Geoapify fetch error:", err);
    }
  };

// ---------- SELECT PLACE ----------
  const handleSelect = (place, type) => {
    const name = place.properties.formatted;
    if (type === "start") {
      setStartLoc(name);
      setStartSuggestions([]);
    } else {
      setEndLoc(name);
      setEndSuggestions([]);
    }
  };

  // ✅ Initialize Google Places Autocomplete
  useEffect(() => {
    if (!window.google || !window.google.maps) return;

    const options = {
      fields: ["formatted_address", "geometry", "name"],
      types: ["geocode"], // or "establishment"
      componentRestrictions: { country: "in" }, // 🇮🇳 restrict to India
    };

    // Start location autocomplete
    const startAutocomplete = new window.google.maps.places.Autocomplete(
      startInputRef.current,
      options
    );
    startAutocomplete.addListener("place_changed", () => {
      const place = startAutocomplete.getPlace();
      setStartLoc(place.formatted_address || place.name);
    });

    // End location autocomplete
    const endAutocomplete = new window.google.maps.places.Autocomplete(
      endInputRef.current,
      options
    );
    endAutocomplete.addListener("place_changed", () => {
      const place = endAutocomplete.getPlace();
      setEndLoc(place.formatted_address || place.name);
    });
  }, []);
  // ✅ Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        startBoxRef.current &&
        !startBoxRef.current.contains(event.target)
      ) {
        setStartSuggestions([]);
      }
      if (
        endBoxRef.current &&
        !endBoxRef.current.contains(event.target)
      ) {
        setEndSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return alert("Add group name");
    setLoading(true);
    try {
      const res = await api.post("/groups", {
        group_name: groupName,
        start_location: startLoc,
        end_location: endLoc,
        total_cost: totalCost ? Number(totalCost) : 0,
        time_range_start: timeStart || null,
        time_range_end: timeEnd || null,
      });
      
      const groupId =
        res.data.id || res.data.group_id || (res.data.group && res.data.group.id);
      alert("Group created!");
      navigate(`/groups`);
    } catch (err) {
      console.error(err);
      alert("Could not create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 shadow rounded-xl">
      <h2 className="text-3xl font-semibold mb-6">Create a new Group</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-base font-medium">Group Name</label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mt-2 block w-full p-3 border rounded-lg text-lg"
            placeholder="Office Commute"
          />
        </div>

        {/* Locations */}
        <div className="grid grid-cols-2 gap-6">
          {/* Start Location */}
          <div className="relative" ref={startBoxRef}>
            <label className="block text-base">Start Location</label>
            <input
              value={startLoc}
              ref={startInputRef}
              onChange={(e) => {
                setStartLoc(e.target.value);
                handleSearch(e.target.value, "start");
              }}
              className="mt-2 block w-full p-3 border rounded-lg text-lg"
              placeholder="Enter pickup location"
            />
            {startSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded-lg mt-1 shadow max-h-48 overflow-y-auto w-full">
                {startSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelect(s, "start")}
                  >
                    {s.properties.formatted}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* End Location */}
          <div className="relative" ref={endBoxRef}>
            <label className="block text-base">End Location</label>
            <input
              value={endLoc}
              ref={endInputRef}
              onChange={(e) => {
                setEndLoc(e.target.value);
                handleSearch(e.target.value, "end");
              }}
              className="mt-2 block w-full p-3 border rounded-lg text-lg"
              placeholder="Enter drop location"
            />
            {endSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded-lg mt-1 shadow max-h-48 overflow-y-auto w-full">
                {endSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelect(s, "end")}
                  >
                    {s.properties.formatted}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-base">Time Range Start</label>
            <input
              type="datetime-local"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="mt-2 block w-full p-3 border rounded-lg text-lg"
            />
          </div>
          <div>
            <label className="block text-base">Time Range End</label>
            <input
              type="datetime-local"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="mt-2 block w-full p-3 border rounded-lg text-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-base">Total Cost (optional)</label>
          <input
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            className="mt-2 block w-60 p-3 border rounded-lg text-lg"
            type="number"
            min="0"
            step="0.01"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  );
}
