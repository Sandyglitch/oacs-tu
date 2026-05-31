import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { User, BookOpen, Upload, Loader2, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, GraduationCap } from "lucide-react";

export default function AdmissionForm() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [existingAppId, setExistingAppId] = useState(null);

  // System Gate State Control
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [closingDate, setClosingDate] = useState("");

  const [formData, setFormData] = useState({
    fullName: userData?.name || "",
    phone: userData?.phone || "",
    email: userData?.email || "",
    fatherName: "",
    motherName: "",
    dob: "",
    gender: "Male",
    category: "General",
    bloodGroup: "O+",
    permanentAddress: "",
    class10Percentage: "",
    class10Board: "",
    class10Year: "",
    class12Percentage: "",
    class12Board: "",
    class12Year: "",
    entranceExamType: "JEE Main",
    entranceScore: "",
  });

  const [coursePrefs, setCoursePrefs] = useState(["B.Tech CSE", "B.Tech ECE", "B.Tech ME"]);
  
  const [documentStrings, setDocumentStrings] = useState({
    identityProof: "",
    markSheet: "",
    ageProofAdmit: "",
    categoryCertificate: "",
  });

  // Effect A: Live listening to the Admin Portal Gateway lock state configurations
  useEffect(() => {
    const unsubSys = onSnapshot(doc(db, "system_state", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsFormOpen(data.isAdmissionWindowOpen !== false);
        if (data.formClosingDate) {
          setClosingDate(data.formClosingDate);
        }
      }
    });
    return () => unsubSys();
  }, []);

  // Effect B: Pull previous student records to populate update panels
  useEffect(() => {
    if (!currentUser) return;
    const checkExistingApplication = async () => {
      try {
        const q = query(collection(db, "applications"), where("studentId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const appDoc = querySnapshot.docs[0];
          const app = appDoc.data();
          
          setFormData({
            fullName: app.studentName || "",
            phone: app.phone || "",
            email: app.email || currentUser.email || "",
            fatherName: app.fatherName || "",
            motherName: app.motherName || "",
            dob: app.dob || "",
            gender: app.gender || "Male",
            category: app.category || "General",
            bloodGroup: app.bloodGroup || "O+",
            permanentAddress: app.permanentAddress || "",
            class10Percentage: app.class10Percentage ? String(app.class10Percentage) : "",
            class10Board: app.class10Board || "",
            class10Year: app.class10Year ? String(app.class10Year) : "",
            class12Percentage: app.class12Percentage ? String(app.class12Percentage) : "",
            class12Board: app.class12Board || "",
            class12Year: app.class12Year ? String(app.class12Year) : "",
            entranceExamType: app.entranceExamType || "JEE Main",
            entranceScore: app.entranceScore ? String(app.entranceScore) : "",
          });
          
          if (app.preferences) setCoursePrefs(app.preferences);
          if (app.documents) setDocumentStrings(app.documents);
          setIsUpdateMode(true);
          setExistingAppId(app.applicationId);
        }
      } catch (err) {
        console.error("Error reading portfolio record:", err);
      }
    };
    checkExistingApplication();
  }, [currentUser]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleBack = () => setStep((prev) => prev - 1);

  // 🛡️ STEP VALIDATION SAFEGUARDS
  const isStep1Valid = () => {
    return (
      formData.fullName.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.fatherName.trim() !== "" &&
      formData.motherName.trim() !== "" &&
      formData.dob !== "" &&
      formData.permanentAddress.trim() !== ""
    );
  };

  const isStep2Valid = () => {
    return (
      formData.class10Percentage.trim() !== "" &&
      formData.class10Board.trim() !== "" &&
      formData.class10Year.trim() !== "" &&
      formData.class12Percentage.trim() !== "" &&
      formData.class12Board.trim() !== "" &&
      formData.class12Year.trim() !== "" &&
      formData.entranceScore.trim() !== ""
    );
  };

  const handleNextStep1 = () => {
    if (!isStep1Valid()) {
      toast.error("Please fill in all personal details before proceeding.");
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!isStep2Valid()) {
      toast.error("All academic marks and boards are required to proceed.");
      return;
    }
    setStep(3);
  };

  const handleNextStep3 = () => {
    setStep(4);
  };

  // AUTOMATIC IMAGE COMPRESSOR & CONVERTER
  const handleFileConversion = (e) => {
    const file = e.target.files[0];
    const fieldName = e.target.name;
    if (!file) return;

    const toastId = toast.loading(`Compressing and preparing ${file.name}...`);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set maximum dimension constraints for documents
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG at 45% quality - yields highly legible text but tiny file footprint
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.45);

        setDocumentStrings((prev) => ({ ...prev, [fieldName]: compressedBase64 }));
        toast.dismiss(toastId);
        toast.success(`${file.name} optimized successfully.`);
      };
    };
    reader.onerror = () => {
      toast.dismiss(toastId);
      toast.error("Failed to read file.");
    };
  };

  const movePreference = (index, direction) => {
    const updated = [...coursePrefs];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setCoursePrefs(updated);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!isFormOpen) return toast.error("Submission blocked. Registration timeline has closed.");
    
    // Check local string records to confirm files exist
    if (!documentStrings.identityProof || !documentStrings.markSheet || !documentStrings.ageProofAdmit) {
      return toast.error("Please attach all mandatory verification records.");
    }

    setLoading(true);
    const processToastId = toast.loading("Saving optimized application data to database...");

    try {
      let finalAppId = existingAppId;

      if (!finalAppId || finalAppId.includes("-") || finalAppId.length !== 12) {
        const uniqueDigits = Math.floor(1000000000 + Math.random() * 9000000000);
        finalAppId = `TU${uniqueDigits}`;

        try {
          await deleteDoc(doc(db, "applications", `TU-${currentUser.uid}`));
        } catch (e) {}
      }

      const payload = {
        applicationId: finalAppId,
        studentId: currentUser.uid,
        studentName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        dob: formData.dob,
        gender: formData.gender,
        category: formData.category,
        bloodGroup: formData.bloodGroup,
        permanentAddress: formData.permanentAddress,
        class10Percentage: parseFloat(formData.class10Percentage) || 0,
        class10Board: formData.class10Board || "",
        class10Year: parseInt(formData.class10Year) || 2024,
        class12Percentage: parseFloat(formData.class12Percentage) || 0,
        class12Board: formData.class12Board || "",
        class12Year: parseInt(formData.class12Year) || 2026,
        entranceExamType: formData.entranceExamType,
        entranceScore: parseFloat(formData.entranceScore) || 0,
        academicPercentage: parseFloat(formData.entranceScore) || 0,
        preferences: coursePrefs,
        status: "pending",
        paymentStatus: "paid",
        documents: documentStrings, // Now securely well under the 1MB limit combined!
        submittedAt: new Date().toISOString(),
        counsellingStatus: "none",
        allotedSeat: "none",
      };

      await setDoc(doc(db, "applications", finalAppId), payload);
      toast.dismiss(processToastId);
      toast.success("Application portfolio submitted successfully on localhost!");
      navigate("/applicant/dashboard");
    } catch (error) {
      toast.dismiss(processToastId);
      console.error(error);
      toast.error("Failed to commit application parameters.");
    } finally {
      setLoading(false);
    }
  };

  if (!isFormOpen) {
    return (
      <div className="min-h-screen bg-darkBg text-textMain flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-cardBg border border-red-500/30 p-8 rounded-2xl shadow-2xl text-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto text-lg font-bold">⚠️</div>
          <h2 className="text-xl font-black text-white">Registration Portal Closed</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            The official timeline window for modifying or submitting new application profiles has expired by order of the Academic Controller desk.
          </p>
          {closingDate && (
            <div className="text-xs bg-black/20 p-2.5 rounded-lg border border-white/5 text-primary font-mono font-bold">
              Deadline was locked on: {closingDate}
            </div>
          )}
          <button onClick={() => navigate("/applicant/dashboard")} className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition">
            Return to Dashboard Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg text-textMain py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-cardBg border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TU Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-black text-white">Tezpur University</h1>
              <p className="text-xs text-primary font-medium">Comprehensive Intake Portal 2026</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/applicant/dashboard")} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition">
            Exit to Dashboard
          </button>
        </div>

        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className={`px-3 py-1.5 rounded-full font-semibold text-xs ${step === 1 ? "bg-primary text-black" : "bg-white/10"}`}>1. Personal Data</span>
            <div className="h-0.5 w-8 bg-white/10"></div>
            <span className={`px-3 py-1.5 rounded-full font-semibold text-xs ${step === 2 ? "bg-primary text-black" : "bg-white/10"}`}>2. Academic Merits</span>
            <div className="h-0.5 w-8 bg-white/10"></div>
            <span className={`px-3 py-1.5 rounded-full font-semibold text-xs ${step === 3 ? "bg-primary text-black" : "bg-white/10"}`}>3. Course Choices</span>
            <div className="h-0.5 w-8 bg-white/10"></div>
            <span className={`px-3 py-1.5 rounded-full font-semibold text-xs ${step === 4 ? "bg-primary text-black" : "bg-white/10"}`}>4. Verification Attachments</span>
          </div>
        </div>

        <form onSubmit={handleSubmitApplication} className="space-y-6">
          {/* STEP 1: PERSONAL PARTICULARS */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2"><User className="w-5 h-5"/> Personal Particulars Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Full Applicant Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Active Mobile Line</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Primary Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Father's Full Name</label>
                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Mother's Full Name</label>
                  <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Gender Identification</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Reservation Category Status</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none">
                    <option value="General">General (Unreserved)</option>
                    <option value="OBC-NCL">OBC-NCL</option>
                    <option value="SC">Scheduled Caste (SC)</option>
                    <option value="ST">Scheduled Tribe (ST)</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Permanent Home Address</label>
                <textarea name="permanentAddress" rows="2" value={formData.permanentAddress} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm focus:border-primary focus:outline-none" required></textarea>
              </div>
              
              <button 
                type="button" 
                onClick={handleNextStep1} 
                className={`w-full font-bold p-3 rounded-xl flex items-center justify-center gap-2 mt-4 text-sm transition ${
                  isStep1Valid() ? "bg-primary text-black" : "bg-white/5 text-gray-500 cursor-not-allowed"
                }`}
              >
                Proceed to Academic Credentials <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          )}

          {/* STEP 2: ACADEMIC DETAILS */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2"><GraduationCap className="w-5 h-5"/> Academic Performance Matrix</h3>
              
              <div className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase text-accent tracking-wider">Class 10 / Secondary Education Metrics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Aggregate Percentage (%)</label>
                    <input type="number" step="0.01" name="class10Percentage" value={formData.class10Percentage} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Education Board Council</label>
                    <input type="text" placeholder="e.g. SEBA, CBSE" name="class10Board" onChange={handleInputChange} value={formData.class10Board} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Year of Passing</label>
                    <input type="number" name="class10Year" value={formData.class10Year} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" required />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase text-accent tracking-wider">Class 12 / Higher Secondary Metrics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Aggregate Percentage (%)</label>
                    <input type="number" step="0.01" name="class12Percentage" value={formData.class12Percentage} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Education Board Council</label>
                    <input type="text" placeholder="e.g. AHSEC, CBSE" name="class12Board" value={formData.class12Board} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Year of Passing</label>
                    <input type="number" name="class12Year" value={formData.class12Year} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" required />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase text-primary tracking-wider">Competitive Entrance Exam Segment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Qualifying Entrance Stream</label>
                    <select name="entranceExamType" value={formData.entranceExamType} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none">
                      <option value="JEE Main">JEE Main National Level</option>
                      <option value="TUEE">TUEE (Tezpur University Entrance Exam)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 text-gray-400">Entrance Score Value (Percentile Rank Index)</label>
                    <input type="number" step="0.00001" placeholder="e.g. 96.425" name="entranceScore" value={formData.entranceScore} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none" required />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={handleBack} className="w-1/2 bg-white/10 text-white font-semibold p-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition"><ArrowLeft className="w-4 h-4"/> Back</button>
                <button 
                  type="button" 
                  onClick={handleNextStep2} 
                  className={`w-1/2 font-bold p-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition ${
                    isStep2Valid() ? "bg-primary text-black" : "bg-white/5 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Continue to Choices <ArrowRight className="w-4 h-4"/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COURSE PREFERENCES */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2"><BookOpen className="w-5 h-5"/> Prioritized Choice List</h3>
              
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary/90 leading-relaxed font-medium">
                  <strong>Notice:</strong> Please arrange choices in your exact order of preference. You can choose any available course during counselling rounds.
                </p>
              </div>

              <div className="space-y-3">
                {coursePrefs.map((course, idx) => (
                  <div key={course} className="flex items-center justify-between p-3.5 bg-black/30 border border-white/10 rounded-xl">
                    <span className="font-semibold text-sm text-white flex items-center gap-3">
                      <span className="text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">Choice #{idx + 1}</span>
                      {course}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => movePreference(idx, -1)} disabled={idx === 0} className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md disabled:opacity-30 text-xs">▲</button>
                      <button type="button" onClick={() => movePreference(idx, 1)} disabled={idx === coursePrefs.length - 1} className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md disabled:opacity-30 text-xs">▼</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={handleBack} className="w-1/2 bg-white/10 text-white font-semibold p-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition"><ArrowLeft className="w-4 h-4"/> Back</button>
                <button type="button" onClick={handleNextStep3} className="w-1/2 bg-primary text-black font-bold p-2.5 rounded-xl flex items-center justify-center gap-2 text-sm">Continue to Documents <ArrowRight className="w-4 h-4"/></button>
              </div>
            </div>
          )}

          {/* STEP 4: DOCUMENT UPLOADS */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2"><Upload className="w-5 h-5"/> Verification Document Vault</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                  <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase">1. Government Identity Voucher</label>
                  <input type="file" name="identityProof" accept="image/*" onChange={handleFileConversion} className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-white/10 file:text-white" required={!isUpdateMode} />
                  {documentStrings.identityProof && <p className="text-[10px] text-green-400 mt-1">✓ Image auto-compressed</p>}
                </div>
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                  <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase">2. Class 10 Admit Card (Age Proof)</label>
                  <input type="file" name="ageProofAdmit" accept="image/*" onChange={handleFileConversion} className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-white/10 file:text-white" required={!isUpdateMode} />
                  {documentStrings.ageProofAdmit && <p className="text-[10px] text-green-400 mt-1">✓ Image auto-compressed</p>}
                </div>
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                  <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase">3. Qualifying Board Marksheet</label>
                  <input type="file" name="markSheet" accept="image/*" onChange={handleFileConversion} className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-white/10 file:text-white" required={!isUpdateMode} />
                  {documentStrings.markSheet && <p className="text-[10px] text-green-400 mt-1">✓ Image auto-compressed</p>}
                </div>
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                  <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase">4. Category Certificate (Optional)</label>
                  <input type="file" name="categoryCertificate" accept="image/*" onChange={handleFileConversion} className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-white/10 file:text-white" />
                  {documentStrings.categoryCertificate && <p className="text-[10px] text-green-400 mt-1">✓ Image auto-compressed</p>}
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={handleBack} disabled={loading} className="w-1/2 bg-white/10 text-white font-semibold p-2.5 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50"><ArrowLeft className="w-4 h-4"/> Back</button>
                <button type="submit" disabled={loading} className="w-1/2 bg-gradient-to-r from-primary to-accent text-black font-extrabold p-2.5 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><CheckCircle className="w-4 h-4"/> {isUpdateMode ? "Save and Update Portfolio" : "Finalize and Lock Portfolio"}</>}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}