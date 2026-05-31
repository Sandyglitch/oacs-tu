import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { Award, HelpCircle, Lock, ArrowUpCircle, ChevronLeft, CreditCard, Calendar, CheckCircle2, RefreshCw } from "lucide-react";

export default function ApplicantCounselling() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [departments, setDepartments] = useState([]); // Handles list parsing maps safely
  const [sysState, setSysState] = useState({ round: 1 });
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // 1. Sync student personal application document parameters
    const q = query(collection(db, "applications"), where("studentId", "==", currentUser.uid));
    const unsubApp = onSnapshot(q, (snap) => {
      if (!snap.empty) setApplication(snap.docs[0].data());
      setLoading(false);
    });

    // 2. ✅ FIXED: Direct snapshot stream tracking the "courses" collection path
    const unsubDepts = onSnapshot(collection(db, "courses"), (snap) => {
      setDepartments(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          availableSeats: data.availableSeats !== undefined ? Number(data.availableSeats) : 0,
          totalSeats: data.totalSeats !== undefined ? Number(data.totalSeats) : 60
        };
      }));
    });

    // 3. Sync universal configurations
    const unsubSys = onSnapshot(doc(db, "system_state", "config"), (snap) => {
      if (snap.exists()) setSysState(snap.data());
    });

    return () => { unsubApp(); unsubDepts(); unsubSys(); };
  }, [currentUser]);

  const handleSeatDecision = async (decision) => {
    if (!application) return;
    try {
      const docRef = doc(db, "applications", application.applicationId);
      
      if (decision === "upgrade" && application.allotedSeat !== "none") {
        // ✅ FIXED: Releases the upgrade vacancy back to the "courses" path
        const currentDeptRef = doc(db, "courses", application.allotedSeat);
        await updateDoc(currentDeptRef, { availableSeats: increment(1) });
        await updateDoc(docRef, { allotedSeat: "none", counsellingStatus: "upgrade" });
      } else {
        await updateDoc(docRef, { counsellingStatus: decision });
      }
      
      toast.success(`Decision recorded: Marked for ${decision.toUpperCase()}`);
    } catch (err) {
      toast.error("Failed to commit seat choice stance.");
    }
  };

  const handleProcessAdmissionFee = async () => {
    setPaying(true);
    try {
      const currentStamp = new Date();
      currentStamp.setDate(currentStamp.getDate() + 7);
      const verificationString = currentStamp.toLocaleDateString("en-IN", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const docRef = doc(db, "applications", application.applicationId);
      await updateDoc(docRef, {
        paymentStatus: "paid_admission",
        physicalVerificationDate: verificationString,
        physicalVerificationVenue: "Dean's Office, School of Engineering, Tezpur University"
      });

      toast.success("Admission fee transaction successfully captured!");
    } catch (err) {
      toast.error("Payment routing infrastructure timed out.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-darkBg text-textMain p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT SECTION: MATRIX DISPLAY VIEW */}
        <div className="bg-cardBg border border-white/10 p-5 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-accent animate-spin-slow"/> Current University Seat Status
          </h3>
          <div className="space-y-2 text-xs">
            {departments.map((dept) => (
              <div key={dept.id} className="p-3 bg-black/20 border border-white/5 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{dept.id}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Total Allocation Index: {dept.totalSeats}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Available Vacancies</span>
                  <span className={`text-sm font-black ${dept.availableSeats > 0 ? "text-accent" : "text-red-400"}`}>{dept.availableSeats} Open</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SECTION: MAIN DECISION TERMINAL AREA */}
        <div className="lg:col-span-2 bg-cardBg border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
          <button onClick={() => navigate("/applicant/dashboard")} className="mb-6 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"><ChevronLeft className="w-4 h-4"/> Back to Dashboard</button>

          <header className="border-b border-white/10 pb-4 mb-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-accent" />
              <div>
                <h1 className="text-xl font-bold text-white">Live Counselling Arena</h1>
                <p className="text-xs text-gray-400">Tezpur University Intake Session 2026</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-xl font-mono text-xs font-bold">Round #{sysState.round}</span>
          </header>

          {!application || application.allotedSeat === "none" ? (
            <div className="text-center py-12 text-sm text-gray-400"><HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />No seat has been assigned to your portfolio index in Round {sysState.round} yet. Await admin rank computations.</div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl text-center">
                <span className="text-xs text-primary font-bold tracking-wider uppercase">Provisional Allocation Result</span>
                <h2 className="text-3xl font-black text-white mt-1">{application.allotedSeat}</h2>
              </div>

              {application.counsellingStatus !== "locked" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button onClick={() => handleSeatDecision("locked")} className="p-4 bg-green-900/20 hover:bg-green-900/40 border border-green-500/30 text-left rounded-xl transition group">
                    <Lock className="w-5 h-5 text-green-400 mb-2" />
                    <h4 className="font-bold text-white text-sm">Lock Current Seat Allocation</h4>
                    <p className="text-xs text-gray-400 mt-1">Accept this offer permanently and lock your seat allocation to proceed to payment.</p>
                  </button>
                  <button onClick={() => handleSeatDecision("upgrade")} className="p-4 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 text-left rounded-xl transition group">
                    <ArrowUpCircle className="w-5 h-5 text-blue-400 mb-2" />
                    <h4 className="font-bold text-white text-sm">Opt for Higher Choice Upgrade</h4>
                    <p className="text-xs text-gray-400 mt-1">Release this current seat allocation back to the pool, remaining eligible for higher preference match checking in the next round.</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-400 shrink-0"/><p className="text-xs text-green-400/90 font-medium">Seat Choice Locked Successfully.</p></div>
                  {application.paymentStatus !== "paid_admission" ? (
                    <div className="p-6 bg-black/40 border border-white/10 rounded-xl space-y-4">
                      <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2"><span className="text-gray-400">Provisional Seat Admission Fee:</span><span className="text-white font-black font-mono text-sm">₹32,450.00</span></div>
                      <button onClick={handleProcessAdmissionFee} disabled={paying} className="w-full py-2.5 bg-primary text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50">{paying ? "Contacting Bank Servers..." : "Authorize Electronic Payment Check"}</button>
                    </div>
                  ) : (
                    <div className="p-6 bg-gradient-to-br from-purple-900/20 to-black/40 border border-purple-500/20 rounded-xl space-y-2 text-xs">
                      <h4 className="text-accent font-bold text-sm">Verification Schedule Clear</h4>
                      <div><span className="text-gray-400 mr-1">Reporting Date:</span>{application.physicalVerificationDate}</div>
                      <div><span className="text-gray-400 mr-1">Venue Assignment:</span>{application.physicalVerificationVenue}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}