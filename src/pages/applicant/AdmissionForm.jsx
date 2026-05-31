// src/pages/applicant/AdmissionForm.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

// Import standard Firestore and Storage hooks
import { db, storage } from "../../services/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function AdmissionForm() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [academicScore, setAcademicScore] = useState("");
  const [preferences, setPreferences] = useState(["", "", ""]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Tezpur University baseline branches fallback matrix
  const STATIC_BRANCHES = [
    { id: "BTECH_CSE", name: "Computer Science & Engineering", remainingSeats: 60 },
    { id: "BTECH_ECE", name: "Electronics & Communication Engineering", remainingSeats: 50 },
    { id: "BTECH_ME", name: "Mechanical Engineering", remainingSeats: 50 },
    { id: "BTECH_EE", name: "Electrical Engineering", remainingSeats: 40 },
    { id: "BTECH_CE", name: "Civil Engineering", remainingSeats: 40 }
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "courses"));
        if (querySnapshot.empty) {
          setCourses(STATIC_BRANCHES);
        } else {
          const list = [];
          querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
          setCourses(list);
        }
      } catch (err) {
        console.warn("Using baseline branch matrix fallback:", err);
        setCourses(STATIC_BRANCHES);
      }
    };
    fetchCourses();
  }, []);

  const handlePreferenceChange = (index, value) => {
    const updated = [...preferences];
    updated[index] = value;
    setPreferences(updated);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!academicScore || preferences.some((p) => p === "")) {
      return toast.error("Please fill out your qualifying score and all 3 branch rankings.");
    }

    setSubmitting(true);
    const applicationUniqueId = `APP-${Date.now()}-${currentUser.uid.slice(0, 4)}`.toUpperCase();

    try {
      let documentUrl = "";

      // Handle mark sheet file upload if provided
      if (file) {
        const fileRef = ref(storage, `marksheets/${currentUser.uid}/${applicationUniqueId}_${file.name}`);
        const uploadSnapshot = await uploadBytes(fileRef, file);
        documentUrl = await getDownloadURL(uploadSnapshot.ref);
      }

      // Commit the complete registration form bundle to Firestore
      await setDoc(doc(db, "applications", applicationUniqueId), {
        applicationId: applicationUniqueId,
        studentId: currentUser.uid,
        academicScore: parseFloat(academicScore),
        choicesArray: preferences, 
        marksheetUrl: documentUrl,
        status: "pending",
        paymentStatus: "pending",
        allotedSeat: "",
        submittedAt: new Date().toISOString()
      });

      toast.success(`Application ${applicationUniqueId} submitted successfully!`);
      setAcademicScore("");
      setPreferences(["", "", ""]);
      setFile(null);
    } catch (error) {
      console.error("Form Submission Error:", error);
      toast.error("Failed to submit application data to the database cloud.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2">Centralized B.Tech Admission Application</h2>
        <p className="text-gray-400 text-sm mb-6">Enter your academic details, rank your course choices, and upload your verification documents.</p>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Section 1: Academic Input Metrics */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Aggregate Qualifying Score (%)</label>
            <input
              type="number"
              step="0.01"
              value={academicScore}
              onChange={(e) => setAcademicScore(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g., 92.45"
            />
          </div>

          {/* Section 2: Document Upload Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Upload Qualifying Marksheet (PDF/Image)</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700 cursor-pointer"
            />
          </div>

          <hr className="border-gray-800 my-6" />

          {/* Section 3: Ordered Branch Preference Rankings */}
          <h3 className="text-lg font-semibold text-blue-400">Branch Preference Rankings</h3>
          
          {preferences.map((pref, index) => (
            <div key={index}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Preference Choice #{index + 1}
              </label>
              <select
                value={pref}
                onChange={(e) => handlePreferenceChange(index, e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Select an engineering branch stream...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id} disabled={preferences.includes(course.id) && pref !== course.id}>
                    {course.name} ({course.remainingSeats} seats remaining)
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-800 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform active:scale-[0.99]"
          >
            {submitting ? "Processing Submission & Uploading Files..." : "Submit Application Blueprint"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdmissionForm;