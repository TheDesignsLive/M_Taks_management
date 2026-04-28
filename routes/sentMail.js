import express from 'express';
const router = express.Router();
import nodemailer from 'nodemailer';

router.post("/send-otp", async (req, res) => {
    const { contact, otp, sent_for } = req.body;

    // Purana configuration jo tumne bataya chal raha hai:
    let transporter = nodemailer.createTransport({
        service: "gmail",
        host: 'smtp.gmail.com', // host specify karna live server par help karta hai
        port: 465,
        secure: true, // SSL use karega
        auth: {
            user: "social.designs.live@gmail.com",
            pass: "ipka xjqi uach zrpc" 
        },
        tls: {
            rejectUnauthorized: false // Certificate issue bypass karne ke liye
        }
    });

    let mailOptions = {
        from: '"TMS Workspace" <social.designs.live@gmail.com>',
        to: contact,
    };

    // --- Dynamic Premium Templates Based on Reason ---
    
    if (sent_for === "forget_password") {
        mailOptions.subject = "Your OTP for Password Reset";
        mailOptions.html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #095959; text-align: center;">Password Reset Request</h2>
                <p style="font-size: 15px; color: #555; text-align: center; font-style: italic; margin-bottom: 25px;">
                    "Secure access to streamline your workflow and master your productivity."
                </p>
                <p style="font-size: 16px; color: #333;">We received a request to reset your password. Use the following One-Time Password (OTP):</p>
                <div style="background-color: #f4fdfd; border: 2px dashed #095959; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #095959;">${otp}</span>
                </div>
                <p style="font-size: 13px; color: #777; text-align: center;">This code is valid for 10 minutes. If you didn't request this, your account is safe.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">© 2026 TMS Workspace. All rights reserved.</p>
            </div>`;
    } 
    
    else if (sent_for === "signup" || sent_for === "verification") {
        mailOptions.subject = "Verify your account – Welcome to TMS!";
        mailOptions.html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #095959; text-align: center;">Welcome to the Team!</h2>
                <p style="font-size: 16px; color: #333;">To complete your signup and secure your account, please use the following One-Time Password (OTP):</p>
                <div style="background-color: #f4fdfd; border: 2px dashed #095959; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #095959;">${otp}</span>
                </div>
                <p style="font-size: 13px; color: #777; text-align: center;">Step into a world of organized productivity. This code expires in 10 minutes.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">© 2026 TMS Workspace. All rights reserved.</p>
            </div>`;
    }

    else if (sent_for === "change_email") {
        mailOptions.subject = "Your OTP for Email Change";
        mailOptions.html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #095959; text-align: center;">Email Address Update</h2>
                <p style="font-size: 16px; color: #333;">You requested to verify or change your email. Please use the following OTP to confirm:</p>
                <div style="background-color: #f4fdfd; border: 2px dashed #095959; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #095959;">${otp}</span>
                </div>
                <p style="font-size: 13px; color: #777; text-align: center;">If you didn't request this, ignore this message. Your current email remains active.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">© 2026 TMS Workspace. All rights reserved.</p>
            </div>`;
    }

    else if (sent_for === "change_password") {
        mailOptions.subject = "Security Alert: OTP to Change Password";
        mailOptions.html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #095959; text-align: center;">Security Verification</h2>
                <p style="font-size: 16px; color: #333;">To finalize your <strong>new password</strong>, please enter the following OTP:</p>
                <div style="background-color: #fef9f9; border: 2px dashed #095959; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #095959;">${otp}</span>
                </div>
                <p style="font-size: 13px; color: #777; text-align: center;">If you did not authorize this change, please secure your account immediately.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">© 2026 TMS Workspace. All rights reserved.</p>
            </div>`;
    }

    else if (sent_for === "delete_profile") {
        mailOptions.subject = "CRITICAL: OTP to Delete Your Profile";
        mailOptions.html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; border-top: 5px solid #d9534f;">
                <h2 style="color: #d9534f; text-align: center;">Account Deletion Request</h2>
                <p style="font-size: 16px; color: #333; text-align: center;">This action is <strong>permanent</strong> and cannot be undone.</p>
                <div style="background-color: #fff5f5; border: 2px dashed #d9534f; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d9534f;">${otp}</span>
                </div>
                <p style="font-size: 13px; color: #777; text-align: center;">If you did not request this, your account may be compromised. Change your password immediately.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">© 2026 TMS Workspace. All rights reserved.</p>
            </div>`;
    }

    // Default Fallback Template
    else {
        mailOptions.subject = `Your OTP Code: ${otp}`;
        mailOptions.text = `Your One-Time Password is ${otp}`;
    }

    try {
        await transporter.sendMail(mailOptions);
        // Responding with "status: sent" to keep Settings Route happy
        res.json({ status: "sent" }); 
    } catch (err) {
        console.error("Mailer Error:", err);
        res.status(500).json({ status: "error", message: "Failed to send email" });
    }
});

export default router;