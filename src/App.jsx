import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import AdmissionForm from "./pages/applicant/AdmissionForm";
import ApplicantDashboard from "./pages/applicant/ApplicantDashboard";
import ApplicantCounselling from "./pages/applicant/ApplicantCounselling";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCounselling from "./pages/admin/AdminCounselling";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function App() {
  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/applicant/dashboard" element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantDashboard /></ProtectedRoute>} />
        <Route path="/applicant/apply" element={<ProtectedRoute allowedRoles={["applicant"]}><AdmissionForm /></ProtectedRoute>} />
        <Route path="/applicant/counselling" element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantCounselling /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/counselling" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCounselling /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;