import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import * as userService from "../services/userServices";
import multer from "multer";
import path from "path";
import moment from "moment";
import Stripe from "stripe";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/emailService";

declare module "express-session" {
  interface SessionData {
    user: {
      id: string | number | undefined;
      username: string;
      email: string;
      subscription: string | undefined;
      trialEndDate: Date | undefined;
      image: string | undefined | null;
      phone_number: number;
      dob: any;
      address: any;
    };
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_XXXXXXXXXXXXXXXXXXXXXX";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Register API
export const register = [
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password, phone_number, address, dob } =
        req.body;

      if (
        !username ||
        !email ||
        !password ||
        !phone_number ||
        !address ||
        !dob
      ) {
        res.status(400).json({
          message:
            "All fields (username, email, password, phone number, address, and DOB) are required",
        });
        return;
      }

      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const image = req.file ? req.file.path : null;
      const trialEndDate = moment().add(7, "days").toDate();

      const user = await userService.registerUser({
        username,
        email,
        password: hashedPassword,
        phone_number,
        address,
        dob,
        image,
        subscription: "free_trial",
        trialEndDate,
      });

      if (!user) {
        res.status(500).json({ message: "Error creating user" });
        return;
      }

      const verificationToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "1d",
      });

      try {
        await sendVerificationEmail(email, verificationToken);
        res.status(201).json({
          message: "User registered successfully. Verification email sent.",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phoneNumber: user.phone_number,
            address: user.address,
            dob: user.dob,
            image: user.image,
            subscription: user.subscription,
            trialEndDate: user.trial_end_date,
          },
        });
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        res.status(500).json({
          message: "User registered, but failed to send verification email",
        });
      }
    } catch (error) {
      console.error("Error in registration:", error);
      res.status(500).json({ message: "Error registering user" });
    }
  },
];

// Login API
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await userService.getUserByEmail(email);
    if (!user) {
      res.status(400).json({ message: "Invalid email" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ message: "Invalid password" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscription: user.subscription,
      trialEndDate: user.trial_end_date,
      image: user.image,
      phone_number: user.phone_number,
      dob: user.dob,
      address: user.address,
    };

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false,
      maxAge: 3600000,
      sameSite: "lax",
    });

    res.json({
      message: "Logged in successfully",
      user: req.session.user,
      token,
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Upgrade Subbscription API
export async function upgradeSubscription(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId, newSubscription } = req.body;

    if (!["standard", "premium"].includes(newSubscription)) {
      res.status(400).json({ message: "Invalid subscription type" });
      return;
    }

    const updatedUser = await userService.upgradeSubscription(
      userId,
      newSubscription
    );

    if (!updatedUser) {
      res.status(404).json({ message: "User not found or update failed" });
      return;
    }

    res.json({
      message: "Subscription updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({ message: "Error upgrading subscription" });
  }
}

// Cancel Subbscription API
export async function cancelSubscription(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.body;

    const updatedUser = await userService.downgradeSubscription(userId);

    if (!updatedUser) {
      res
        .status(404)
        .json({ message: "User not found or cancellation failed" });
      return;
    }

    res.json({
      message: "Subscription cancelled successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Error cancelling subscription" });
  }
}

// Create Stripe Checkout Session API
export async function createStripeCheckoutSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId, subscriptionType } = req.body;

    if (!["standard", "premium"].includes(subscriptionType)) {
      res.status(400).json({ message: "Invalid subscription type" });
      return;
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const priceIds: { [key: string]: string } = {
      standard: "price_1QMxeRGDjVerw5izOS7LkidL",
      premium: "price_1QNGq8GDjVerw5izQBXkhha3",
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceIds[subscriptionType],
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: `http://localhost:5173`,
      cancel_url: `http://localhost:5173`,
    });

    res.json({
      message: "Stripe checkout session created",
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    res.status(500).json({ message: "Error creating Stripe Checkout session" });
  }
}

// Create Logout API
export function logout(req: Request, res: Response): void {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).json({ message: "Error logging out" });
    } else {
      res.clearCookie("authToken");
      res.json({ message: "Logged out successfully" });
    }
  });
}

// Location API
const locations = [
  {
    id: 1,
    name: "Central Park SOLE",
    latitude: 40.785091,
    longitude: -73.968285,
  },
  {
    id: 2,
    name: "Times Square",
    latitude: 40.758896,
    longitude: -73.98513,
  },
  {
    id: 3,
    name: "Empire State Building",
    latitude: 40.748817,
    longitude: -73.985428,
  },
];

export async function getLocations(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      message: "Locations retrieved successfully",
      locations,
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Verify Email API
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: "Token is required" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    if (!decoded || !decoded.userId) {
      res.status(400).json({ success: false, message: "Invalid token" });
      return;
    }

    const userId = parseInt(decoded.userId, 10);

    if (isNaN(userId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid user ID in token" });
      return;
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (user.isVerified) {
      res
        .status(400)
        .json({ success: false, message: "User already verified" });
      return;
    }

    await userService.updateUser(userId, { isVerified: true });

    res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ success: false, message: "Error verifying email" });
  }
}

// Update Profile API
export const updateProfile = [
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { username, dob, address, phone_number } = req.body;

      if (!id || !username) {
        res.status(400).json({ message: "User ID and username are required" });
        return;
      }

      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        res.status(400).json({ message: "Invalid user ID" });
        return;
      }

      const user = await userService.getUserById(userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const updatedFields: {
        username: string;
        dob?: any;
        address?: any;
        phone_number?: number;
        image?: string;
      } = { username };

      if (dob) updatedFields.dob = dob;
      if (address) updatedFields.address = address;
      if (phone_number) updatedFields.phone_number = phone_number;
      if (req.file) updatedFields.image = req.file.path;

      const updatedUser = await userService.updateUser(userId, updatedFields);

      if (!updatedUser) {
        res.status(500).json({ message: "Error updating profile" });
        return;
      }

      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          image: updatedUser.image,
          dob: updatedUser.dob,
          address: updatedUser.address,
          phone_number: updatedUser.phone_number,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Error updating profile" });
    }
  },
];

// Update Password API
export async function updatePassword(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    const { oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      res.status(400).json({
        message: "User ID, old password, and new password are required",
      });
      return;
    }

    if (newPassword.length < 6) {
      res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
      return;
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // const isOldPasswordValid = await bcrypt.compare(oldPassword, oldPassword);
    // if (!isOldPasswordValid) {
    //   res.status(400).json({ message: "Old password is incorrect" });
    //   return;
    // }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await userService.updateUser(userId, {
      password: hashedNewPassword,
    });

    if (!updatedUser) {
      res.status(500).json({ message: "Error updating password" });
      return;
    }

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Error updating password" });
  }
}

// User API
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ message: "Users fetched successfully", users });
  } catch (error) {
    console.error("Error in getAllUsers API:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Forgot Password API
export async function forgotPassword(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await userService.getUserByEmail(email);

    if (!user) {
      res.status(400).json({ message: "User with this email does not exist" });
      return;
    }

    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `http://localhost:5173/update-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(email, resetLink);
      res.status(200).json({
        message:
          "Password reset email sent successfully. Please check your email",
      });
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      res.status(500).json({
        message: "Failed to send password reset email",
      });
    }
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// Profile API
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = 19;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: No user logged in" });
      return;
    }

    const user = await userService.getUserById(Number(userId));

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      message: "User profile retrieved successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscription: user.subscription,
        trialEndDate: user.trial_end_date,
        image: user.image,
        phone_number: user.phone_number,
        dob: user.dob,
        address: user.address,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
}

// Update Password From Token API
export async function updatePasswordFromToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: "Token and new password are required" });
      return;
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
      res.status(400).json({ message: "Invalid or expired token" });
      return;
    }

    const userId = parseInt(decodedToken.userId, 10);

    if (isNaN(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    if (newPassword.length < 6) {
      res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await userService.updateUser(userId, {
      password: hashedPassword,
    });
    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in update password:", error);
    res.status(500).json({ message: "Server error" });
  }
}
