import express from 'express';
import multer from 'multer';
import { Resend } from 'resend';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module path fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET_TOKEN = "CHRONICLE_2025_SECURE";
const resend = new Resend(process.env.RESEND_API_KEY);
const logoURL = 'https://raw.githubusercontent.com/Yisraelfx/The-O.-E.-Foundation/main/assets/logo.jpg';

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// --- 1. MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        cb(null, `volunteer-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } 
});

// --- 2. SUBMISSION ROUTE ---
app.post('/submit-volunteer', upload.single('passport'), async (req, res) => {
    const data = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ status: 'error', message: 'No passport photo uploaded.' });
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const approveLink = `${protocol}://${host}/approve?email=${encodeURIComponent(data.email)}&token=${SECRET_TOKEN}`;

    try {
        await resend.emails.send({
            from: 'O.E.F Foundation <onboarding@resend.dev>',
            to: 'blackondoboy@gmail.com',
            subject: `📜 New Volunteer Credentials: ${data.fullName}`,
            html: `
            <div style="background-color: #1B120F; padding: 40px; font-family: sans-serif; text-align: center; color: #F5F5DC;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #D4AF37; padding: 50px; background-color: #2D1B15;">
                    <h1 style="color: #D4AF37;">Onakpa Emmanuel Foundation</h1>
                    <p>New registration received for <strong>${data.fullName}</strong>.</p>
                    <a href="${approveLink}" style="background-color: #D4AF37; color: #1B120F; padding: 15px 25px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px;">
                       Approve Volunteer
                    </a>
                </div>
            </div>`,
            attachments: [{
                filename: file.originalname,
                content: fs.readFileSync(file.path),
            }],
        });

        fs.unlinkSync(file.path); // Delete local temp file
        res.status(200).json({ status: 'success', message: 'Application received' });
    } catch (error) {
        console.error('Resend Error:', error);
        res.status(500).json({ status: 'error', message: 'Email failed to send.' });
    }
});

// --- 3. SECURE APPROVAL ROUTE ---
app.get('/approve', async (req, res) => {
    const { email, token } = req.query;

    if (token !== SECRET_TOKEN) {
        return res.status(403).send("Invalid token.");
    }

    const volunteerID = `OEF-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
        console.log(`Processing approval for: ${email}`);
        
        // Send Approval Email
        await resend.emails.send({
            from: 'O.E.F Administration <onboarding@resend.dev>',
            to: 'issyrhym3z@gmail.com',
            subject: "Congratulations! Your Application has been Approved",
            html: `<div style="font-family: sans-serif; color: #1B120F;">
                    <h2 style="color: #D4AF37;">Approved</h2>
                    <p>Welcome to the Onakpa Emmanuel Foundation.</p>
                    <p>Volunteer ${email} has been approved. ID: ${volunteerID}</p>
                   </div>`
        });

        // Send ID Email
        await resend.emails.send({
            from: 'O.E.F Archive <onboarding@resend.dev>',
            to: 'issyrhym3z@gmail.com',
            subject: "OFFICIAL DIGITAL ID",
            html: `<div style="text-align: center;">
                    <h3>ID: ${volunteerID}</h3>
                    <a href="https://onakpa-foundation.onrender.com/download-id?email=${encodeURIComponent(email)}&id=${volunteerID}">Download PDF</a>
                   </div>`
        });

        res.send(`<h1 style="color:gold; text-align:center;">SUCCESS: Approval & ID Sent!</h1>`);
    } catch (error) {
        console.error('Approval Error:', error);
        res.status(500).send("Error sending emails.");
    }
});

// --- 4. PRINTABLE ID ROUTE ---
app.get('/download-id', (req, res) => {
    const { email, id } = req.query;
    res.send(`
        <html>
            <body onload="window.print()">
                <div style="width: 400px; height: 250px; background: #1B120F; color: #F5F5DC; border: 5px solid #D4AF37; padding: 20px; margin: 50px auto; text-align: center; font-family: sans-serif;">
                    <h1 style="color: #D4AF37;">O.E.F</h1>
                    <h2>${email}</h2>
                    <p>ID NO: ${id}</p>
                </div>
            </body>
        </html>`);
});

app.listen(PORT, () => {
    console.log(`✅ Server Active on Port ${PORT}`);
});