// src/pages/applicant/AdmissionForm.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

// Import standard Firestore hooks
import { db } from "../../services/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

function AdmissionForm() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [academicScore, setAcademicScore] = useState("");
  const [preferences, setPreferences] = useState(["", "", ""]); 
  const [submitting, setSubmitting] = useState(false);

  // hardcoded fallback list just in case your backend collections aren't seeded yet
  const STATIC_BRANCHES = [
    { id: "BTECH_CSE", name: "Computer Science & Engineering", remainingSeats: 60 },
    { id: "BTECH_ECE", name: "Electronics & Communication Engineering", remainingSeats: 50 },
    { id: "BTECH_ME", name: "Mechanical Engineering", remainingSeats: 50 },
    { id: "BTECH_EE", name: "Electrical Engineering", remainingSeats: 40 },
    { id: "BTECH_CE", name: "Civil Engineering", remainingSeats: 40 }
  ];

  useEffect(() => {
    // Try to pull current vacancies from a Firestore collection named 'courses'
    const fetchCourses = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "courses"));
        if (querySnapshot.empty) {
          // If Firestore is empty right now, fall back to our local list
          setCourses(STATIC_BRANCHES);
        } else {
          const list = [];
          querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
          setCourses(list);
        }
      } catch (err) {
        console.warn("Firestore collection empty or inaccessible, using default branch layout matrix:", err);
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!academicScore || preferences.some((p) => p === "")) {
      return toast.error("Please fill out your aggregate percentage and all 3 branch rankings.");
    }

    setSubmitting(true);
    const applicationUniqueId = `APP-${Date.now()}-${currentUser.uid.slice(0, 4)}`.toUpperCase();

    try {
      // Push the entire document object block straight into a single Firestore document!
      await setDoc(doc(db, "applications", applicationUniqueId), {
        applicationId: applicationUniqueId,
        studentId: currentUser.uid,
        academicScore: parseFloat(academicScore),
        choicesArray: preferences, // Clean, nested string array ordering choice 1, 2, and 3
        status: "pending",
        paymentStatus: "pending",
        allotedSeat: "",
        submittedAt: new Date().toISOString()
      });

      toast.success(`Application Document ${applicationUniqueId} filed successfully!`);
    } catch (error) {
      console.error("Firestore Writing Error:", error);
      toast.error("Failed to write document parameters to Cloud Firestore.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2">Centralized B.Tech Admission Application</h2>
        <p className="text-gray-400 text-sm mb-6">Firestore NoSQL Stack Engine Mode</p>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Aggregate Qualifying Score (%)</label>
            <input
              type="number"
              step="0.01"
              value={academicScore}
              onChange={(e) => setAcademicScore(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., 92.45"
            />
          </div>

          <hr className="border-gray-800 my-6" />

          <h3 className="text-lg font-semibold text-blue-400">Branch Preference Rankings</h3>
          
          {preferences.map((pref, index) => (
            <div key={index}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Preference Choice #{index + 1}
              </label>
              <select
                value={pref}
                onChange={(e) => handlePreferenceChange(index, e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
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
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-800 text-white font-bold py-3 rounded-lg shadow-lg"
          >
            {submitting ? "Writing Application Document..." : "Submit Application Form"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdmissionForm;