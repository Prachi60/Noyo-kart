import crypto from "crypto";
import jwt from "jsonwebtoken";
import OtpVerification from "../models/otpVerification.js";
import { getRedisClient } from "../config/redis.js";
import { MOCK_OTP } from "../utils/otp.js";
import { sendForgotPasswordEmail, useRealEmailOTP } from "./emailService.js";

const FORGOT_PASSWORD_PURPOSE = "forgot_password";
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY = "15m";
const OTP_LENGTH = 4;

function verificationSecret() {
  return process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "unsafe-dev-secret";
}

function randomOtp(length) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function hashOtp(target, otp) {
  return crypto
    .createHmac("sha256", verificationSecret())
    .update(`${FORGOT_PASSWORD_PURPOSE}:email:${target}:${otp}`)
    .digest("hex");
}

export async function issueResetOtp(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  
  const otp = useRealEmailOTP() ? randomOtp(OTP_LENGTH) : MOCK_OTP;
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const otpHash = hashOtp(normalizedEmail, otp);

  let session = await OtpVerification.findOne({
    purpose: FORGOT_PASSWORD_PURPOSE,
    channel: "email",
    target: normalizedEmail,
  });

  if (session) {
    session.otpHash = otpHash;
    session.expiresAt = expiresAt;
    session.verifiedAt = null;
    session.failedAttempts = 0;
    session.lastSentAt = now;
    await session.save();
  } else {
    await OtpVerification.create({
      purpose: FORGOT_PASSWORD_PURPOSE,
      channel: "email",
      target: normalizedEmail,
      otpHash,
      expiresAt,
      lastSentAt: now,
    });
  }

  // Send Email
  if (useRealEmailOTP()) {
    await sendForgotPasswordEmail(normalizedEmail, otp);
  } else {
    console.log(`[ForgotPasswordOTP][mock] ${normalizedEmail} -> ${otp}`);
  }

  return {
    success: true,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
  };
}

export async function verifyResetOtp(email, otp) {
  const normalizedEmail = email.toLowerCase().trim();
  const session = await OtpVerification.findOne({
    purpose: FORGOT_PASSWORD_PURPOSE,
    channel: "email",
    target: normalizedEmail,
  }).select("+otpHash +expiresAt");

  if (!session || session.expiresAt < new Date()) {
    throw new Error("OTP expired or invalid");
  }

  const isValid = hashOtp(normalizedEmail, otp) === session.otpHash;
  if (!isValid) {
    session.failedAttempts = (session.failedAttempts || 0) + 1;
    await session.save();
    throw new Error("Invalid OTP");
  }

  // Mark as verified but we don't delete yet, we issue a token
  session.verifiedAt = new Date();
  await session.save();

  const resetToken = jwt.sign(
    { email: normalizedEmail, purpose: "password_reset_confirmed" },
    verificationSecret(),
    { expiresIn: RESET_TOKEN_EXPIRY }
  );

  return { resetToken };
}

export function validateResetToken(token, email) {
  try {
    const payload = jwt.verify(token, verificationSecret());
    if (payload.purpose !== "password_reset_confirmed" || payload.email !== email.toLowerCase().trim()) {
      throw new Error("Invalid reset token context");
    }
    return true;
  } catch (error) {
    throw new Error("Invalid or expired reset token");
  }
}

export async function clearResetSession(email) {
  await OtpVerification.deleteOne({
    purpose: FORGOT_PASSWORD_PURPOSE,
    channel: "email",
    target: email.toLowerCase().trim(),
  });
}
