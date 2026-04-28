import express from 'express';
const router = express.Router();
import nodemailer from 'nodemailer';

router.post("/send-otp", async (req, res) => {
    const { contact, otp, sent_for } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "social.designs.live@gmail.com",
            pass: "ipka xjqi uach zrpc" 
        }
    });

    let subject = "Verification Code";
    let color = "#0F8989"; // Teal
    let title = "Verification Required";

    if(sent_for === "change_password") {
        subject = "Security Alert: Change Password OTP";
        title = "Password Change";
    } else if(sent_for === "change_email") {
        subject = "OTP for Email Update";
        title = "Email Update";
    } else if(sent_for === "delete_profile") {
        subject = "CRITICAL: OTP to Delete Account";
        color = "#d9534f"; // Red
        title = "Account Deletion";
    }

    const mailOptions = {
        from: 'social.designs.live@gmail.com',
        to: contact,
        subject: subject,
        html: `
            <div style="font-family: Arial; max-width: 400px; margin: auto; border: 1px solid #eee; border-top: 4px solid ${color}; padding: 20px; border-radius: 8px;">
                <h2 style="color: ${color}; text-align: center;">${title}</h2>
                <p style="text-align: center; color: #555;">Use the following OTP to verify your action:</p>
                <div style="background: #f4fdfd; border: 2px dashed ${color}; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; color: ${color}; letter-spacing: 5px;">
                    ${otp}
                </div>
                <p style="font-size: 12px; color: #888; text-align: center;">This code is valid for 10 minutes. If you didn't request this, ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, status: "sent" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Mailer Error" });
    }
});

export default router;