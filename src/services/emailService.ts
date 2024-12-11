import nodemailer from "nodemailer";

export async function sendVerificationEmail(
  email: string,
  verificationToken: string
) {
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: "kira.damore@ethereal.email",
      pass: "pnzVDmqpJPRkVkkRTe",
    },
  });

  const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email Verification",
    html: `<p>Thank you for registering. Please verify your email by clicking the following link:</p>
           <a href="${verificationUrl}">Verify Email</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "kira.damore@ethereal.email",
        pass: "pnzVDmqpJPRkVkkRTe",
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to update your password:</p>
             <p><a href="${resetLink}">Reset Password</a></p>`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}
