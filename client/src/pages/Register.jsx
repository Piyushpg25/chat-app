import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ParticlesBackground from "@/components/three/ParticlesBackground";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long.")
    .max(20, "Username cannot be more than 20 characters long."),
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long.")
    .regex(/[A-Z]/, "At least one uppercase letter is required.")
    .regex(/[0-9]/, "At least one number is required."),
});

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await api.post("/auth/register", data);
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome, ${res.data.user.username}! 🎉`);
      navigate("/chat");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <ParticlesBackground />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl "
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="p-4 rounded-2xl bg-indigo-500/20 border border-indigo-500/30">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-center text-white mb-1"
        >
          Create Account
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-white/50 text-sm mb-8"
        >
          Register a new account
        </motion.p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            {
              name: "username",
              placeholder: "Username",
              type: "text",
              delay: 0.5,
            },
            { name: "email", placeholder: "Email", type: "email", delay: 0.6 },
            {
              name: "password",
              placeholder: "Password",
              type: "password",
              delay: 0.7,
            },
          ].map(({ name, placeholder, type, delay }) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay }}
            >
              <Input
                {...register(name)}
                type={type}
                placeholder={placeholder}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500"
              />
              {errors[name] && (
                <p className="text-red-400 text-xs mt-1">
                  {errors[name].message}
                </p>
              )}
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-2xl transition-all duration-300"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Register"
              )}
            </Button>
          </motion.div>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-white/40 text-sm mt-6"
        >
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Login
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Register;
