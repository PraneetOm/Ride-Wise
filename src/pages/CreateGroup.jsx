import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function CreateGroup(){
  const [groupName, setGroupName] = useState("");
  const [startLoc, setStartLoc] = useState("");
  const [endLoc, setEndLoc] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return alert("Add group name");
    setLoading(true);
    try {
      const res = await api.post("/groups", {
        group_name: groupName,
        start_location: startLoc,
        end_location: endLoc,
        total_cost: totalCost ? Number(totalCost) : 0
      });
      const groupId = res.data.id || res.data.group_id || (res.data.group && res.data.group.id);
      alert("Group created!");
      navigate(`/group/${groupId}`);
    } catch (err) {
      console.error(err);
      alert("Could not create group");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">Create a new Group</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Group Name</label>
          <input value={groupName} onChange={e=>setGroupName(e.target.value)} className="mt-1 block w-full p-2 border rounded" placeholder="Office Commute"/>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Start Location</label>
            <input value={startLoc} onChange={e=>setStartLoc(e.target.value)} className="mt-1 block w-full p-2 border rounded"/>
          </div>
          <div>
            <label className="block text-sm">End Location</label>
            <input value={endLoc} onChange={e=>setEndLoc(e.target.value)} className="mt-1 block w-full p-2 border rounded"/>
          </div>
        </div>

        <div>
          <label className="block text-sm">Total Cost (optional)</label>
          <input value={totalCost} onChange={e=>setTotalCost(e.target.value)} className="mt-1 block w-48 p-2 border rounded" type="number" min="0" step="0.01"/>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  );
}