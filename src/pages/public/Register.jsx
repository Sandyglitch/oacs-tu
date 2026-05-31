import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { UserPlus, User, Mail, Phone, Lock, Loader2 } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { registerStudent } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) return toast.error("Please populate all fields.");
    if (password.length < 6) return toast.error("Password must contain at least 6 characters.");

    setLoading(true);
    try {
      await registerStudent(email, password, name, phone);
      toast.success("Account created! Verification email dispatched.");
      navigate("/student/dashboard");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl -top-10 -left-10"></div>
      <div className="absolute w-96 h-96 bg-accent/10 rounded-full blur-3xl -bottom-10 -right-10"></div>

      <div className="w-full max-w-md bg-cardBg backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-2xl z-10">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Create Account</h2>
          <p className="text-sm text-gray-400 mt-2">Register for Counselling Session 2026</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMain mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-primary transition"
                placeholder="Sandipan Roy"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textMain mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-primary transition"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textMain mb-1">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-primary transition"
                placeholder="Contact Number"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textMain mb-1">Create Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-primary transition"
                placeholder="Minimum 6 characters"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-5 h-5" /> Open Account
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Already registered?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}