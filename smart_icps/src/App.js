import Navbar from "./components/common/Navbar";
import CustomDashBoard from "./page/CustomDashBoard";
import WarrentySubmitPage from "./page/WarrentySubmitPage";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./page/LandingPage";
import SmartTable from "./page/SmartTable";


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/claim" element={<WarrentySubmitPage />} />
        {/* <Route path="/claim-history" element={<ClaimHistoryPage />} />
      <Route path="/reports" element={<ReportsPage />} />
       */}
       <Route path="/reports" element={<CustomDashBoard />} />
       <Route path="/" element={<LandingPage />} />
       <Route path="/smarttable" element={<SmartTable />} />
      </Routes>
    </>

  );
}

export default App;
