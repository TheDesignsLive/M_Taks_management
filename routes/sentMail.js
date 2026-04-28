import express from 'express';
const router = express.Router();
import nodemailer from 'nodemailer';

router.post("/send-otp", async (req, res) => {
    const { contact, otp, sent_for } = req.body;

    // Yahan tera Nodemailer ka pura setup aayega (Transporter etc.)
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "social.designs.live@gmail.com",
            pass: "ipka xjqi uach zrpc" 
        }
    });

    const mailOptions = {
        from: 'social.designs.live@gmail.com',
        to: contact,
        subject: `Your OTP for ${sent_for}`,
        text: `Your OTP code is ${otp}`
        // Yahan tu apna pura HTML template dal sakta hai
    };

    try {
        await transporter.sendMail(mailOptions);
        
        // YE LINE SABSE ZAROORI HAI (Backend yahi mang raha hai)
        res.json({ status: "sent" }); 
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", message: "Failed to send email" });
    }
});

export default router;