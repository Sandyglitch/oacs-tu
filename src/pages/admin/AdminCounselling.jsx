import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { collection, onSnapshot, doc, updateDoc, increment, runTransaction, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { Award, Zap, RefreshCw, ChevronLeft, Layers, FileSpreadsheet, Play, Square } from "lucide-react";

export default function AdminCounselling() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [departments, setDepartments] = useState([]); 
  const [sysState, setSysState] = useState({ round: 1, isRoundActive: false });
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    // 1. Sync active application documents
    const unsubApps = onSnapshot(collection(db, "applications"), (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Syncing strictly to the "courses" collection path
    const unsubDepts = onSnapshot(collection(db, "courses"), (snap) => {
      setDepartments(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, 
          availableSeats: data.availableSeats !== undefined ? Number(data.availableSeats) : 0,
          totalSeats: data.totalSeats !== undefined ? Number(data.totalSeats) : 60
        };
      }));
    }, (err) => {
      console.error("Matrix compilation subscription fault:", err);
    });

    // 3. Sync round control tokens
    const unsubSys = onSnapshot(doc(db, "system_state", "config"), (snap) => {
      if (snap.exists()) setSysState(snap.data());
    });

    return () => { unsubApps(); unsubDepts(); unsubSys(); };
  }, []);

  // 🔌 TOGGLES THE ACTIVE STATUS OF THE CURRENT COUNSELLING ROUND
  const handleToggleRoundActive = async () => {
    try {
      const configRef = doc(db, "system_state", "config");
      const nextActiveState = !sysState.isRoundActive;
      
      await setDoc(configRef, {
        isRoundActive: nextActiveState
      }, { merge: true });

      if (nextActiveState) {
        toast.success(`Counselling Round #${sysState.round} has been started live!`);
      } else {
        toast.success(`Counselling Round #${sysState.round} has been paused/stopped.`);
      }
    } catch (err) {
      toast.error("Failed to alter round operational toggle state.");
    }
  };

  const handleExportRoundSheet = () => {
    if (applications.length === 0) return toast.error("No allocation data found for this round.");

    const roundData = applications.map(app => ({
      "Registration Code": app.applicationId || "N/A",
      "Student Name": app.studentName || "N/A",
      "Rank Score Index": app.academicPercentage ? `${app.academicPercentage}%` : "N/A",
      "Category Status": app.category || "N/A",
      "Allotted Branch": app.allotedSeat === "none" ? "Unallocated" : app.allotedSeat,
      "Lock/Upgrade Stance": (app.counsellingStatus || "Pending Action").toUpperCase(),
      "Payment Handshake": app.paymentStatus === "paid_admission" ? "FEES PAID" : "PENDING"
    }));

    const worksheet = XLSX.utils.json_to_sheet(roundData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Round ${sysState.round} Matrix`);
    XLSX.writeFile(workbook, `TU_Counselling_Round_${sysState.round}_Report.xlsx`);
    toast.success(`Round #${sysState.round} metrics sheet exported!`);
  };

  // ⚡ SEAT MATRIX TRANSACTION ALLOCATION
  const handleRunMeritAllocation = async () => {
    // Safety guard: Prevent allocation loops if the round has not been initialized to active yet
    if (!sysState.isRoundActive) {
      return toast.error(`Round #${sysState.round} is currently closed. Click "Start Current Round" first!`);
    }

    const eligibleQueue = applications
      .filter(app => app.status === "approved" && app.counsellingStatus !== "locked")
      .sort((a, b) => b.academicPercentage - a.academicPercentage);

    if (eligibleQueue.length === 0) {
      return toast.error("No active un-locked approved applications found to allocate.");
    }

    setAllocating(true);
    let successfulAllocations = 0;

    try {
      for (const applicant of eligibleQueue) {
        await runTransaction(db, async (transaction) => {
          const deptDocsRefs = applicant.preferences.map(course => doc(db, "courses", course));
          const deptSnaps = [];
          
          for (const ref of deptDocsRefs) {
            deptSnaps.push(await transaction.get(ref));
          }

          let targetCourseToAllot = "none";
          
          for (let i = 0; i < applicant.preferences.length; i++) {
            const currentCourseName = applicant.preferences[i];
            const deptSnap = deptSnaps[i];

            if (deptSnap.exists()) {
              const currentAvailableSeats = deptSnap.data().availableSeats ?? 0;
              if (currentAvailableSeats > 0) {
                targetCourseToAllot = currentCourseName;
                break;
              }
            }
          }

          if (targetCourseToAllot !== "none") {
            const applicantDocRef = doc(db, "applications", applicant.applicationId);
            const selectedDeptRef = doc(db, "courses", targetCourseToAllot);

            transaction.update(applicantDocRef, { allotedSeat: targetCourseToAllot });
            transaction.update(selectedDeptRef, { availableSeats: increment(-1) });
            
            successfulAllocations++;
          }
        });
      }

      toast.success(`Seat matrix transaction complete! ${successfulAllocations} branches updated.`);
    } catch (err) {
      console.error(err);
      toast.error("Allocation aborted due to high database traffic.");
    } finally {
      setAllocating(false);
    }
  };

  const handleAdvanceRoundCycle = async () => {
    try {
      const nextRound = (sysState.round || 1) + 1;
      await updateDoc(doc(db, "system_state", "config"), { 
        round: nextRound,
        isRoundActive: false // Auto-reset active window state for the incoming phase round
      });
      toast.success(`System migrated cleanly to Round #${nextRound}`);
    } catch (err) {
      toast.error("Failed to increment central timeline phase.");
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-textMain p-8 space-y-6">
      
      {/* Upper Header Controls Layout */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-cardBg border border-white/10 p-4 rounded-xl">
        <button onClick={() => navigate("/admin/dashboard")} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
          <ChevronLeft className="w-4 h-4"/> Return to Dashboard
        </button>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* 🔘 NEW INITIALIZE/STOP LIVE ROUND MANAGEMENT ACTION BUTTON */}
          <button 
            onClick={handleToggleRoundActive}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition ${
              sysState.isRoundActive 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {sysState.isRoundActive ? (
              <><Square className="w-3.5 h-3.5 fill-current"/> Stop Current Phase</>
            ) : (
              <><Play className="w-3.5 h-3.5 fill-current"/> Start Current Round</>
            )}
          </button>

          <button onClick={handleExportRoundSheet} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition">
            <FileSpreadsheet className="w-4 h-4"/> Export Current Round Sheet
          </button>
          
          <button onClick={handleAdvanceRoundCycle} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
            <Layers className="w-4 h-4 text-accent"/> Advance Next Round Phase
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN MODULE DECK */}
        <div className="space-y-4">
          {/* LIVE STATUS CARD INDICATOR */}
          <div className="bg-cardBg border border-white/10 p-5 rounded-2xl shadow-xl space-y-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Operational Timeline Window</span>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-white">Counselling Round #{sysState.round}</h2>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${
                sysState.isRoundActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {sysState.isRoundActive ? "Live / Accepting Options" : "Closed / Locked"}
              </span>
            </div>
          </div>

          {/* LIVE SEATS BALANCE MATRIX CARD */}
          <div className="bg-cardBg border border-white/10 p-5 rounded-2xl shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary animate-spin-slow"/> Live Seats Balance Matrix
            </h3>
            
            <div className="space-y-3">
              {departments.map((dept) => (
                <div key={dept.id} className="p-3 bg-black/30 border border-white/5 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-white">{dept.id}</p>
                    <span className="text-[10px] text-gray-500 font-medium">Total Capacity: {dept.totalSeats}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Remaining</span>
                    <span className={`text-base font-black font-mono ${dept.availableSeats > 0 ? "text-primary" : "text-red-400"}`}>
                      {dept.availableSeats}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-cardBg border border-white/10 p-5 rounded-2xl shadow-xl space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Automated Priority Seat Lock</h4>
            <button 
              onClick={handleRunMeritAllocation} 
              disabled={allocating} 
              className="w-full py-2.5 bg-gradient-to-r from-primary to-accent text-black font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 transition"
            >
              <Zap className="w-4 h-4 fill-current"/> {allocating ? "Running Transactions..." : "Run Automated Merit Allocation"}
            </button>
          </div>
        </div>

        {/* DISTRIBUTION LEDGER PANELS */}
        <div className="lg:col-span-2 bg-cardBg border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-white/5 bg-white/5">
              <h3 className="font-bold text-white text-sm">Active Choice Distribution Ledger — Round #{sysState.round}</h3>
            </div>
            <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
              {applications.length === 0 ? (
                <p className="p-8 text-center text-gray-500 italic text-xs">No candidate data present to track.</p>
              ) : (
                applications.map((app) => (
                  <div key={app.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition text-xs">
                    <div>
                      <p className="font-bold text-white text-sm">{app.studentName} <span className="text-primary font-mono font-medium text-xs">({app.academicPercentage}%)</span></p>
                      <p className="text-gray-400 font-mono text-[10px] mt-0.5">Preferences: {app.preferences?.join(" → ")}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-black uppercase text-xs tracking-wide ${app.allotedSeat === "none" ? "text-yellow-400/50 italic" : "text-green-400"}`}>
                        {app.allotedSeat === "none" ? "Unallocated" : app.allotedSeat}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}