import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {  z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ParticlesBackground from "@/components/three/ParticlesBackground";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";


const loginSchema = z.object({
  email: z.string().email("Enter valid email address"),
  password: z.string().min(6, "Enter the password"),
});

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await api.post("/auth/login", data);
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.username}! 👋 `);
      navigate("/chat");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative">
      
      
      <ParticlesBackground />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-8 rounded-2xl border border-white/10
      bg-white/5 backdrop-blur-xl shadow-2xl relative z-10  "
      >
        {/* {LOGO} */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="p-4 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 ">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-center text-white mb-1"
        >
          Welcome Back
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-white/50 text-sm mb-8"
        >
          Please log in to your account.
        </motion.p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Input
              {...register("email")}
              type="email"
              placeholder="Email"
              className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Input
              {...register("password")}
              type="password"
              placeholder="Password"
              className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-2xl transition-all duration-300 "
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login"}
            </Button>
          </motion.div>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="text-center text-white/40 text-sm mt-6"
        >
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-indigo-400 hover:text-indigo-300 font-medium "
          >
            Register
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
