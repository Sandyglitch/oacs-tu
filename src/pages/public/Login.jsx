import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Loader2, ShieldAlert } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.value]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🎓 1. OFFICIAL TU ADMINISTRATIVE INTERCEPTOR GATE
      if (formData.email.endsWith("@tezu.ernet.in") && formData.password === "admin@TU2026") {
        let user;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
          user = userCredential.user;
        } catch (authError) {
          // Auto-seed user record if not present in Auth ecosystem
          if (authError.code === "auth/user-not-found" || authError.code === "auth/invalid-credential") {
            const newCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            user = newCredential.user;
          } else {
            throw authError;
          }
        }

        // Force role alignment inside database collection
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          role: "admin",
          email: formData.email,
          name: "Tezpur University Administrator",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        toast.success("Official TU Admin Clearance Authenticated!");
        navigate("/admin/dashboard");
        setLoading(false);
        return;
      }

      // 👤 2. STANDARD APPLICANT RUNTIME LOGIC
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/applicant/dashboard");
      }
      toast.success("Welcome back!");
    } catch (error) {
      console.error(error);
      toast.error("Invalid email domain prefix or structural password match.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-textMain">
      <div className="sm:mx-auto sm:w-full sm:w-max flex flex-col items-center">
        <img src="/logo.png" alt="Tezpur University Logo" className="w-20 h-20 object-contain mb-4 animate-pulse" />
        <h2 className="text-center text-3xl font-black tracking-tight text-white">Tezpur University Portal</h2>
        <p className="mt-1 text-center text-sm text-gray-400">Online Admission & Counselling Framework</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-cardBg py-8 px-4 border border-white/10 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-lg">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-xl bg-black/40 border border-white/10 p-3 text-white text-sm focus:border-primary focus:outline-none" required />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Password Access Token</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-1 block w-full rounded-xl bg-black/40 border border-white/10 p-3 text-white text-sm focus:border-primary focus:outline-none" required />
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-black text-black bg-primary hover:opacity-95 transition disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Workspace"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs">
            <Link to="/register" className="text-gray-400 hover:text-white font-medium transition">
              New applicant? Open a dashboard portal here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}