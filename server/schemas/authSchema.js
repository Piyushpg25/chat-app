const { z, email } = require("zod");

const registerSchema = z.object({
  username: z
    .string()
    .min(4, "Username must be at least 4 characters long.")
    .max(20, "Username cannot be longer than 20 characters.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Only letters, numbers, and underscores are allowed in the username.",
    ),

  email: z.string().email("Please enter a valid email address."),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),

  password: z.string().min(1, "enter the Password"),
});

module.exports = { registerSchema, loginSchema };
