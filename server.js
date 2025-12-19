const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

/** * SECURITY CONFIGURATION
 * Change 'CHRONICLE_2025_SECURE' to your own private password.
 */
const SECRET_TOKEN = "CHRONICLE_2025_SECURE"; 

// --- MIDDLEWARE ---
app.use(cors());

// Increase payload limits to handle large 12MB+ images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Ensure 'uploads' folder exists for temporary photo storage
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// --- 1. MULTER CONFIGURATION (Handles File Uploads) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        cb(null, `volunteer-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit for breathing room
});

// --- 2. NODEMAILER CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'onakpaemmanuelfoundation@gmail.com',
        pass: 'lmtgcbdqeugvxvbw' // Your 16-digit Google App Password
    }
});

// --- 3. SUBMISSION ROUTE ---
app.post('/submit-volunteer', upload.single('passport'), (req, res) => {
    const data = req.body;
    const file = req.file;

    // Basic validation
    if (!file) {
        return res.status(400).json({ status: 'error', message: 'No passport photo uploaded.' });
    }

    // Generate the Secure Approval Link
const protocol = req.protocol;
const host = req.get('host');
const approveLink = `${protocol}://${host}/approve?email=${encodeURIComponent(data.email)}&token=${SECRET_TOKEN}`;

    // Professional Gold-Themed Email Template
    const mailOptions = {
        from: 'onakpaemmanuelfoundation@gmail.com',
        to: 'blackondoboy@gmail.com',
        subject: `📜 New Volunteer Credentials: ${data.fullName}`,
        html: `
            <div style="background-color: #1B120F; padding: 40px; font-family: 'Montserrat', Helvetica, Arial, sans-serif; text-align: center; color: #F5F5DC;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #D4AF37; padding: 50px; background-color: #2D1B15; box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);">
                    
                    <h1 style="font-weight: 100; letter-spacing: 6px; text-transform: uppercase; color: #D4AF37; margin-bottom: 10px; font-size: 20px;">Onakpa Emmanuel Foundation</h1>
                    <div style="height: 1px; width: 60px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 20px auto;"></div>
                    <h2 style="font-weight: 300; letter-spacing: 3px; font-size: 12px; text-transform: uppercase; margin-bottom: 40px; opacity: 0.8;">Volunteer Registration Archive</h2>

                    <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                        ${[
                            ['FULL NAME', data.fullName],
                            ['DATE OF BIRTH', data.dob],
                            ['EMAIL', data.email],
                            ['PHONE', data.phone],
                            ['NATIONALITY', data.nationality],
                            ['LANGUAGE', data.language],
                            ['INTEREST', data.interest],
                            ['TRANSPORT', data.transport],
                            ['CRIMINAL RECORD', data.criminal_record]
                        ].map(([label, value]) => `
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(212, 175, 55, 0.2); color: #D4AF37; font-size: 10px; letter-spacing: 1px; width: 40%;"><strong>${label}</strong></td>
                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(212, 175, 55, 0.2);">${value || 'N/A'}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td style="padding: 12px 0; color: #D4AF37; font-size: 10px; letter-spacing: 1px; vertical-align: top;"><strong>MOTIVATION</strong></td>
                            <td style="padding: 12px 0; font-style: italic; opacity: 0.9;">"${data.motivation}"</td>
                        </tr>
                    </table>

                    <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid rgba(212, 175, 55, 0.1);">
                        <a href="${approveLink}" style="background-color: #D4AF37; color: #1B120F; padding: 18px 35px; text-decoration: none; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; font-weight: bold; border-radius: 2px; display: inline-block;">
                           Approve Volunteer
                        </a>
                    </div>

                    <div style="margin-top: 60px; font-size: 9px; letter-spacing: 3px; opacity: 0.4; text-transform: uppercase;">
                        Onakpa Emmanuel Foundation • ...we split the seas, so you can walk right through it
                    </div>
                </div>
            </div>
        `,
        attachments: [{ path: file.path }]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Email error:', error);
            return res.status(500).json({ status: 'error', message: 'Email failed to send.' });
        }
        console.log('Application sent for:', data.fullName);

        // Clean up: Delete the file from the /uploads folder after sending the email
fs.unlink(file.path, (err) => {
    if (err) console.error("Error deleting file:", err);
    else console.log(`Successfully deleted temp file: ${file.path}`);
});

        res.status(200).json({ status: 'success', message: 'Application received' });
    });
});

// --- 4. SECURE APPROVAL ROUTE ---
app.get('/approve', (req, res) => {
    const { email, token } = req.query;

    // 1. Validate the token
    if (token !== SECRET_TOKEN) {
        return res.status(403).send("Invalid approval token.");
    }

    // 2. Prepare the Approval Email for the Applicant
    const approvalMailOptions = {
        from: `"Onakpa Emmanuel Foundation" <${process.env.GMAIL_USER}>`,
        to: email, // The applicant's email
        subject: "Congratulations! Your Application has been Approved",
        html: `
            <div style="font-family: 'Montserrat', sans-serif; color: #1B120F;">
                <h2 style="color: #D4AF37;">Welcome to the Foundation</h2>
                <p>Dear Volunteer,</p>
                <p>We are pleased to inform you that your application to the <strong>Onakpa Emmanuel Foundation</strong> has been reviewed and <strong>APPROVED</strong>.</p>
                <p>Your profile has been added to our Global Archive, and a coordinator will reach out to you shortly regarding next steps.</p>
                <br>
                <p>Best Regards,</p>
                <p><strong>The O.E.F Administration Team</strong></p>
                <hr style="border: 0; border-top: 1px solid #D4AF37;">
                <small>Onakpa Emmanuel Foundation• ...we split the seas, so you can walk right through it</small>
            </div>
        `
    };

    // 3. Send the email
    transporter.sendMail(approvalMailOptions, (error, info) => {
        if (error) {
            console.error("Error sending approval email:", error);
            return res.status(500).send("Admin approved, but failed to notify the applicant.");
        }
        
        console.log(`Approval notification sent to: ${email}`);
        res.send(`
            <h1 style="color: gold; background: #1B120F; padding: 20px; text-align: center;">
                Volunteer Approved Successfully
            </h1>
            <p style="text-align: center;">A confirmation email has been sent to ${email}.</p>
        `);
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server Active: http://localhost:${PORT}`);
});