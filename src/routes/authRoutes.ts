import express from "express";
import * as authController from "../controllers/authController";
import * as locationController from "../controllers/locationController";
import * as eventController from "../controllers/eventController";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.put("/upgrade-subscription", authController.upgradeSubscription);
router.put("/cancel-subscription", authController.cancelSubscription);
router.post(
  "/create-checkout-session",
  authController.createStripeCheckoutSession
);
router.get("/locations", locationController.getLocations);
router.post("/verify-email", authController.verifyEmail);
router.put("/profile/:id", authController.updateProfile);
router.put("/update-password/:id", authController.updatePassword);
router.get("/users", authController.getAllUsers);
router.post("/events", eventController.createEvent);
router.get("/events", eventController.getEventsForUser);
router.post("/reset-password", authController.forgotPassword);
router.get("/profile", authController.getProfile);
router.put("/update-password", authController.updatePasswordFromToken);
router.put("/events/:eventId", eventController.editEvent);

export default router;
