import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import CreateGroup from "./pages/CreateGroup";
import GroupList from "./pages/GroupList";
import GroupPage from "./pages/GroupPage";
import Login from "./pages/AuthPage"

export default function App(){
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow p-4 flex justify-between">
          <Link to="/groups" className="font-bold text-xl">RideWise</Link>
          <div className="flex gap-4">
            <Link to="/groups" className="text-sm">Groups</Link>
            <Link to="/create" className="text-sm text-blue-600">Create Group</Link>
          </div>
        </nav>

        <main className="p-6">
          <Routes>                
            <Route path="/" element={<Login />} />
            <Route path="/groups" element={<GroupList/>} />
            <Route path="/create" element={<CreateGroup/>} />
            <Route path="/group/:id" element={<GroupPage/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}