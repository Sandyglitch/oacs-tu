import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { generateAdmissionReceipt } from "../../utils/pdfGenerator";
import { LayoutDashboard, LogOut, FileText, Bell, Award, Download, Calendar } from "lucide-react";

export default function ApplicantDashboard() {
  const { currentUser, userData, logout } = useAuth();
  const [application, setApplication] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    // 🛡️ THE INBOX VERIFICATION INTERCEPTOR GUARD:
    if (!currentUser.emailVerified) {
      setFetching(false);
      return;
    }

    const q = query(collection(db, "applications"), where("studentId", "==", currentUser.uid));
    
    const unsubApp = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setApplication(snap.docs[0].data());
      } else {
        setApplication(null);
      }
      setFetching(false);
    }, (error) => {
      console.error("Error fetching application query snapshot:", error);
      setFetching(false);
    });

    // ✅ FIXED ACTION: Sync and chronologically sort announcements array elements
    const unsubAnnounce = onSnapshot(collection(db, "announcements"), (snap) => {
      const listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // ⏳ CHRONOLOGICAL DESCENDING SORT: Ensures latest published lists sit at index 0
      listings.sort((a, b) => {
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });
      
      setAnnouncements(listings);
    });

    return () => { unsubApp(); unsubAnnounce(); };
  }, [currentUser]);

  if (currentUser && !currentUser.emailVerified) {
    return (
      <div className="min-h-screen bg-darkBg text-textMain flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-cardBg border border-accent/20 p-8 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ✉️
          </div>
          <h2 className="text-xl font-black text-white">Verify Your Email Address</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            An official onboarding voucher has been dispatched to <span className="text-primary font-bold">{currentUser.email}</span>. Please click the link inside your inbox to unlock your active portal session.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button onClick={() => window.location.reload()} className="w-full py-2.5 bg-primary text-black rounded-xl text-xs font-black shadow-lg hover:opacity-90 transition">
              I Have Verified (Reload Dashboard)
            </button>
            <button onClick={async () => { await logout(); navigate("/login"); }} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-medium transition">
              Sign Out / Terminate Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg text-textMain flex flex-col md:flex-row">
      {/* Sidebar Navigation Panel */}
      <aside className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="TU Logo" className="w-10 h-10 object-contain"/>
            <div>
              <h2 className="text-lg font-black text-white tracking-wider">OACS TU</h2>
              <p className="text-xs text-primary font-medium">Tezpur University</p>
            </div>
          </div>
          <nav className="space-y-3">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm transition">
              <LayoutDashboard className="w-4 h-4" /> Overview Area
            </button>
            <button onClick={() => navigate("/applicant/apply")} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl text-sm font-medium transition">
              <FileText className="w-4 h-4" /> {application ? "Update Admission Form" : "Fill Admission Form"}
            </button>
            <button onClick={() => navigate("/applicant/counselling")} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl text-sm font-medium transition">
              <Award className="w-4 h-4" /> Counselling Arena
            </button>
          </nav>
        </div>
        <button onClick={async () => { await logout(); navigate("/login"); }} className="flex items-center gap-2 text-sm text-red-400 font-semibold p-2 mt-8 hover:text-red-300 transition">
          <LogOut className="w-4 h-4" /> Terminate Session
        </button>
      </aside>

      {/* Main Framework Dashboard Workspace */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {userData?.name || "Applicant"}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Central Admission Portal — Session 2026</p>
          </div>
          <span className="px-3 py-1 bg-cardBg rounded-full text-xs font-bold border border-white/10 text-accent uppercase">APPLICANT MODE</span>
        </header>

        {fetching ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* APPLICATION PROFILE CARD */}
              <div className="bg-cardBg border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Application Profile
                </h3>
                
                {!application ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400 mb-4">No active application records registered for Session 2026.</p>
                    <button onClick={() => navigate("/applicant/apply")} className="px-5 py-2.5 bg-primary text-black font-bold text-xs rounded-xl hover:opacity-90 transition">
                      Initialize Application Form
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                      <div>
                        <span className="text-xs text-gray-400">Registration Code</span>
                        <p className="font-mono text-sm text-white font-bold mt-0.5">{application.applicationId}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">Fees Status</span>
                        <span className={`inline-block px-2 py-0.5 text-xs font-black rounded uppercase mt-1 ${
                          application.paymentStatus === 'paid_admission' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {application.paymentStatus === 'paid_admission' ? 'ADMISSION FEES PAID' : 'PENDING ENROLLMENT FEES'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-0.5">Merit Base Score</span>
                        <span className="text-white font-bold">{application.academicPercentage}%</span>
                      </div>
                      <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-0.5">Category</span>
                        <span className="text-white font-bold">{application.category}</span>
                      </div>
                      <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-0.5">Alloted Seat</span>
                        <span className="text-accent font-bold uppercase">{application.allotedSeat === 'none' ? 'Awaiting Round' : application.allotedSeat}</span>
                      </div>
                    </div>

                    {application.paymentStatus === "paid_admission" && (
                      <button 
                        onClick={() => generateAdmissionReceipt(application)} 
                        className="w-full py-2.5 bg-gradient-to-r from-primary to-accent text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/10 hover:opacity-90 transition"
                      >
                        <Download className="w-4 h-4"/> Download Consolidated Admission Receipt & GatePass
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* POST-ADMISSION ARRIVAL SCHEDULE NOTICE */}
              {application?.paymentStatus === "paid_admission" && (
                <div className="bg-cardBg border border-white/10 p-6 rounded-2xl flex items-start gap-4 backdrop-blur-md animate-fadeIn">
                  <div className="p-3 bg-accent/10 rounded-xl text-accent shrink-0">
                    <Calendar className="w-6 h-6"/>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <h4 className="font-extrabold text-sm text-white">Physical Document Verification Clearance Live</h4>
                    <p className="text-gray-400 leading-relaxed">Your application dossier has cleared initial ranking pipelines. You are requested to present your verification vouchers physically at Tezpur University:</p>
                    <div className="mt-2 p-3 bg-black/30 rounded-lg border border-white/5 font-medium text-gray-200">
                      <div><span className="text-gray-400 mr-1 font-normal">Reporting Date:</span> {application.physicalVerificationDate}</div>
                      <div className="mt-1"><span className="text-gray-400 mr-1 font-normal">Assigned Venue:</span> {application.physicalVerificationVenue}</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Academic Notifications Panel */}
            <div className="bg-cardBg border border-white/10 p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-accent" /> Academic Desk Notifications</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {announcements.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No incoming public broadsheets active.</p>
                  ) : (
                    announcements.map((ann, idx) => (
                      <div key={ann.id || idx} className="p-3 bg-white/5 rounded-xl border-l-2 border-primary text-xs space-y-1">
                        <p className="text-gray-200 font-bold">{ann.title}</p>
                        <p className="text-gray-400">{ann.message}</p>
                        
                        {ann.type === "merit_list" && ann.fileData && (
                          <a 
                            href={ann.fileData} 
                            download="TU_Official_Merit_List_2026.txt" 
                            className="text-primary font-bold hover:underline mt-2 flex items-center gap-1 w-fit cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5"/> Download Published Ranking Data
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}