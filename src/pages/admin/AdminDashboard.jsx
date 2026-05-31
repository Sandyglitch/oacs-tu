import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Users, CheckCircle, Clock, Award, Megaphone, LogOut, ShieldCheck, Eye, XCircle, FileSpreadsheet, Download, ShieldAlert } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);

  // Portal Lock Controller States
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [dateInput, setDateInput] = useState("2026-06-18");

  useEffect(() => {
    // Sync applications pool dynamically from Firestore
    const unsubDocs = onSnapshot(collection(db, "applications"), (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Sync live system state configurations
    const unsubSys = onSnapshot(doc(db, "system_state", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsWindowOpen(data.isAdmissionWindowOpen !== false);
        if (data.formClosingDate) setDateInput(data.formClosingDate);
      }
    });

    return () => { unsubDocs(); unsubSys(); };
  }, []);

  const handleToggleAdmissionWindow = async () => {
    try {
      const configRef = doc(db, "system_state", "config");
      await setDoc(configRef, {
        isAdmissionWindowOpen: !isWindowOpen,
        formClosingDate: dateInput
      }, { merge: true });
      
      toast.success(!isWindowOpen ? "Registration window opened live!" : "Registration window locked successfully!");
    } catch (err) {
      toast.error("Failed to update portal configuration.");
    }
  };

  // ✅ ENHANCED MERIT GENERATOR: Creates the text content and pushes it to announcements
  const handleGenerateAndPublishMeritList = async () => {
    if (applications.length === 0) return toast.error("No student profiles available to compute rankings.");
    
    // Sort all application records safely by checking existence of score metrics
    const rankOrder = [...applications]
      .filter(app => app.studentName) // Guards against half-formed or raw empty documents
      .sort((a, b) => (b.academicPercentage || 0) - (a.academicPercentage || 0));

    let textContent = "TEZPUR UNIVERSITY CENTRAL COUNSELLING MERIT LEDGER - 2026\n";
    textContent += "====================================================================\n\n";
    
    rankOrder.forEach((student, index) => {
      const scoreString = student.academicPercentage !== undefined ? `${student.academicPercentage}%` : "0%";
      const categoryString = student.category || "General";
      const idString = student.applicationId || "N/A";

      textContent += `Rank #${index + 1} | Score: ${scoreString} | Code: ${idString} | Name: ${student.studentName} | Category: ${categoryString}\n`;
    });

    try {
      const announceId = `ANNC-${Date.now()}`;
      const base64File = "data:text/plain;base64," + btoa(textContent);

      // ✅ EXPLICIT WRITE: Saves with clear types so the applicant side can filter it
      await setDoc(doc(db, "announcements", announceId), {
        title: "Official Provisional Merit Rank List Released",
        message: "Central seat matrix allocation is now live based on the aggregate priority ledger.",
        type: "merit_list", 
        fileData: base64File,
        timestamp: new Date().toISOString()
      });

      // Also trigger an immediate local fallback download for the admin
      const element = document.createElement("a");
      element.href = base64File;
      element.download = "TU_Official_Merit_List_2026.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Merit ranking sheet published to all applicant boards!");
    } catch (err) {
      console.error("Merit list compiling error log:", err);
      toast.error("Failed to compile merit broadcast records.");
    }
  };

  const handleApproveApplication = async (appId) => {
    try {
      const docRef = doc(db, "applications", appId);
      await updateDoc(docRef, { status: "approved" });
      toast.success(`Application ${appId} approved successfully!`);
      setSelectedApp(null);
    } catch (err) {
      toast.error("Failed to commit approval permissions.");
    }
  };

  const handleDownloadAdmissionsSheet = () => {
    if (applications.length === 0) return toast.error("No applicant records present in the database to export.");

    const formattedRows = applications.map((app) => ({
      "Registration Code": app.applicationId || "N/A",
      "Applicant Name": app.studentName || "N/A",
      "Email Address": app.email || "N/A",
      "Phone Number": app.phone || "N/A",
      "Father's Name": app.fatherName || "N/A",
      "Mother's Name": app.motherName || "N/A",
      "Date of Birth": app.dob || "N/A",
      "Gender": app.gender || "N/A",
      "Category": app.category || "N/A",
      "Permanent Address": app.permanentAddress || "N/A",
      "Class 10 Percentage": app.class10Percentage ? `${app.class10Percentage}%` : "N/A",
      "Class 10 Board": app.class10Board || "N/A",
      "Class 10 Year": app.class10Year || "N/A",
      "Class 12 Percentage": app.class12Percentage ? `${app.class12Percentage}%` : "N/A",
      "Class 12 Board": app.class12Board || "N/A",
      "Class 12 Year": app.class12Year || "N/A",
      "Entrance Stream": app.entranceExamType || "N/A",
      "Entrance Rank/Score": app.academicPercentage ? `${app.academicPercentage}%` : "N/A",
      "Verification Status": (app.status || "pending").toUpperCase(),
      "Allocated Branch": app.allotedSeat === "none" ? "Awaiting Round" : app.allotedSeat,
      "Counselling Stance": (app.counsellingStatus || "none").toUpperCase(),
      "Payment Status": app.paymentStatus === "paid_admission" ? "FEES PAID" : "PENDING",
      "Physical Verification Schedule": app.physicalVerificationDate || "Awaiting Payment",
      "Verification Venue": app.physicalVerificationVenue || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions Master Ledger");
    XLSX.writeFile(workbook, `Tezpur_University_Master_Admissions_Report_2026.xlsx`);
    toast.success("Master spreadsheet generated and downloaded successfully!");
  };

  const pendingCount = applications.filter(a => a.status === "pending").length;
  const approvedCount = applications.filter(a => a.status === "approved").length;

  return (
    <div className="min-h-screen bg-darkBg text-textMain flex flex-col md:flex-row relative">
      {/* Sidebar Navigation Panel */}
      <aside className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="TU Logo" className="w-10 h-10 object-contain" />
            <div>
              <h2 className="text-lg font-black text-white">TU CONTROLLER</h2>
              <p className="text-xs text-accent font-bold">Academic Core</p>
            </div>
          </div>
          <button onClick={handleGenerateAndPublishMeritList} className="w-full py-3 bg-gradient-to-r from-primary to-accent text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition">
            <Megaphone className="w-4 h-4"/> Publish Merit List
          </button>
          <button onClick={() => navigate("/admin/counselling")} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition">
            <Award className="w-4 h-4"/> Live Counselling Desk
          </button>
          <button onClick={handleDownloadAdmissionsSheet} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition">
            <FileSpreadsheet className="w-4 h-4"/> Download Admissions Sheet
          </button>
        </div>
        <button onClick={async () => { await logout(); navigate("/login"); }} className="mt-8 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-semibold transition">
          <LogOut className="w-4 h-4" /> Exit Panel
        </button>
      </aside>

      {/* Main Content Workspace Frame */}
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <header className="border-b border-white/5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Admin Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">Review documentation logs, authorize verifications, and monitor finalized admissions</p>
          </div>
          <button onClick={handleDownloadAdmissionsSheet} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition">
            <Download className="w-4 h-4 text-primary" /> Export Data Ledger (.xlsx)
          </button>
        </header>

        {/* ADMISSION GATEWAY CONTROLLER WIDGET PANEL */}
        <div className="bg-cardBg border border-white/10 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-accent"/> Admission Intake Portal Gateway Control</h3>
              <p className="text-xs text-gray-400 mt-0.5">Toggle student form editing visibility and lock down formal operational deadlines globally</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
                <label className="text-[11px] text-gray-400 font-bold uppercase">Deadline Date:</label>
                <input type="text" value={dateInput} onChange={(e) => setDateInput(e.target.value)} placeholder="e.g. June 15, 2026" className="bg-transparent text-xs text-white font-bold focus:outline-none w-32" />
              </div>
              <button 
                onClick={handleToggleAdmissionWindow}
                className={`px-4 py-2 text-xs font-black rounded-xl transition shadow-lg ${
                  isWindowOpen ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isWindowOpen ? "Lock Forms Globally (Close Portal)" : "Unlock Forms Globally (Open Portal)"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs border-t border-white/5 pt-2.5">
            <span className="text-gray-400">Current Gateway Operational State:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isWindowOpen ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {isWindowOpen ? "Portal Open & Accepting Submissions" : "Portal Terminated / Locked"}
            </span>
          </div>
        </div>

        {/* Statistical KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-cardBg border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><Users className="w-6 h-6"/></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Total Portfolios</p><p className="text-2xl font-black text-white mt-0.5">{applications.length}</p></div>
          </div>
          <div className="bg-cardBg border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400"><Clock className="w-6 h-6"/></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Pending Audit</p><p className="text-2xl font-black text-yellow-400 mt-0.5">{pendingCount}</p></div>
          </div>
          <div className="bg-cardBg border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-400"><CheckCircle className="w-6 h-6"/></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Approved Applications</p><p className="text-2xl font-black text-green-400 mt-0.5">{approvedCount}</p></div>
          </div>
        </div>
        
        {/* Active Backlog Table */}
        <div className="bg-cardBg border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5">
            <h3 className="font-bold text-white text-base">Active Applicant Document Submissions</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div></div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No applicant profiles submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/30 border-b border-white/10 text-gray-400 font-semibold">
                    <th className="p-4">Applicant Particulars</th>
                    <th className="p-4">Entrance Parameters</th>
                    <th className="p-4">Rank Index Score</th>
                    <th className="p-4 text-center">Verification Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-white/5 transition">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{app.studentName}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">Registration Code: {app.applicationId} | {app.category}</div>
                      </td>
                      <td className="p-4 text-gray-300 font-medium">{app.entranceExamType || "JEE Main"}</td>
                      <td className="p-4 font-mono text-accent font-bold text-sm">{app.academicPercentage}%</td>
                      <td className="p-4 text-center">
                        {app.status === "approved" ? (
                          <span className="px-3 py-1 rounded bg-green-500/10 text-green-400 font-black tracking-wide uppercase">Application Approved</span>
                        ) : (
                          <button onClick={() => setSelectedApp(app)} className="px-3 py-1.5 bg-primary hover:opacity-90 text-black font-extrabold rounded-lg flex items-center gap-1.5 mx-auto transition"><Eye className="w-3.5 h-3.5"/> Audit Files</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* DOCUMENT AUDITING OVERLAY MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">{selectedApp.studentName}</h2>
                <p className="text-xs text-gray-400 mt-1 font-mono">Registration ID: {selectedApp.applicationId} | Phone: {selectedApp.phone}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-white"><XCircle className="w-6 h-6"/></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-black/20 p-4 rounded-xl border border-white/5">
              <div><span className="text-gray-400 block mb-0.5">Class 10 Scores</span><p className="text-white font-bold">{selectedApp.class10Percentage}% ({selectedApp.class10Board} - {selectedApp.class10Year})</p></div>
              <div><span className="text-gray-400 block mb-0.5">Class 12 Scores</span><p className="text-white font-bold">{selectedApp.class12Percentage}% ({selectedApp.class12Board} - {selectedApp.class12Year})</p></div>
              <div><span className="text-gray-400 block mb-0.5">{selectedApp.entranceExamType} Score</span><p className="text-accent font-black text-sm">{selectedApp.academicPercentage}% Percentile</p></div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Uploaded Verification Vouchers Application</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">1. Government Identity Voucher</span>
                  {selectedApp.documents?.identityProof ? <img src={selectedApp.documents.identityProof} alt="ID" className="w-full h-40 object-cover rounded-lg border border-white/10" /> : <div className="h-40 bg-white/5 rounded-lg flex items-center justify-center text-xs text-gray-500 italic">Unattached</div>}
                </div>
                <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">2. Class 10 Admit (Age Proof)</span>
                  {selectedApp.documents?.ageProofAdmit ? <img src={selectedApp.documents.ageProofAdmit} alt="Age" className="w-full h-40 object-cover rounded-lg border border-white/10" /> : <div className="h-40 bg-white/5 rounded-lg flex items-center justify-center text-xs text-gray-500 italic">Unattached</div>}
                </div>
                <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">3. Class 12 Marksheet</span>
                  {selectedApp.documents?.markSheet ? <img src={selectedApp.documents.markSheet} alt="Marksheet" className="w-full h-40 object-cover rounded-lg border border-white/10" /> : <div className="h-40 bg-white/5 rounded-lg flex items-center justify-center text-xs text-gray-500 italic">Unattached</div>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button onClick={() => setSelectedApp(null)} className="w-1/3 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs transition">Decline & Keep Suspended</button>
              <button onClick={() => handleApproveApplication(selectedApp.id)} className="w-2/3 py-2.5 bg-gradient-to-r from-primary to-accent text-black font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-primary/10 transition"><ShieldCheck className="w-4 h-4"/> Verify and Approve Application for Counselling</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}