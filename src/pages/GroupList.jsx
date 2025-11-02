import { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";

export default function GroupList(){
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    async function load(){
      try {
        const res = await api.get("/groups");
        console.log(res.data);
        setGroups(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Available Groups</h1>
      {loading ? <p>Loading...</p> : (
        <div className="grid gap-4">
          {groups.length === 0 && <p>No groups yet. <Link to="/create" className="text-blue-600">Create one</Link></p>}
          {groups.map(g => (
            <div key={g.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{g.group_name}</h3>
                <p className="text-sm text-gray-600">{g.start_location} → {g.end_location}</p>
              </div>
              <Link to={`/group/${g.id}`} className="text-blue-600">Open</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}