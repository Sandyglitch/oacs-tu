// src/pages/public/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext"; 

// 1. Import your standard web app's database instance and Firestore methods
import { db } from "../../services/firebase"; // Adjust this path to where your initializeApp(firebaseConfig) lives
import { doc, setDoc } from "firebase/firestore"; 

function Register() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth(); 
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      return toast.error("Please fill in all layout fields.");
    }

    setLoading(true);
    try {
      // Step A: Create authentication account credentials
      const userCredential = await signUp(formData.email, formData.password);
      const authenticatedUser = userCredential.user;

      // Step B: Write a flexible NoSQL document into Firestore
      await setDoc(doc(db, "users", authenticatedUser.uid), {
        uid: authenticatedUser.uid,
        name: formData.name,
        email: formData.email,
        role: "applicant", // Defaults new accounts to applicants
        createdAt: new Date().toISOString()
      });

      toast.success("Account documented successfully in Cloud Firestore!");
      navigate("/applicant/dashboard"); 
    } catch (error) {
      console.error("Registration Error:", error);
      toast.error(error.message || "An error occurred during enrollment processing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-3xl font-extrabold text-center text-white mb-2">Create Account</h2>
        <p className="text-sm text-gray-400 text-center mb-6">Tezpur University Counselling Hub (Firestore Mode)</p>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Full Name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="example@tu.ac.in"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg mt-2"
          >
            {loading ? "Writing Document..." : "Register Now"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          Already registered?{" "}
          <Link to="/login" className="text-blue-400 hover:underline">Log in here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;