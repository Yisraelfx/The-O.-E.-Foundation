import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// These two lines are needed to make __dirname work in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/** * SECURITY CONFIGURATION
 * Change 'CHRONICLE_2025_SECURE' to your own private password.
 */
const SECRET_TOKEN = "CHRONICLE_2025_SECURE";
const resend = new Resend(process.env.RESEND_API_KEY);

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

// --- 2. RESEND CONFIGURATION ---
const { Resend } = require('resend');

// --- 3. SUBMISSION ROUTE ---
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
            from: 'O.E.F Foundation <onboarding@resend.dev>', // Keep this during testing
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
                            ['MOTIVATION', data.motivation],
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

            attachments: [
                {
                    filename: file.originalname,
                    content: fs.readFileSync(file.path), // Read the file for Resend
                },
            ],
        });

        // Clean up temp file
        fs.unlinkSync(file.path);
        console.log('Application sent for:', data.fullName);
        res.status(200).json({ status: 'success', message: 'Application received' });

    } catch (error) {
        console.error('Resend Submission Error:', error);
        res.status(500).json({ status: 'error', message: 'Email failed to send.' });
    }
});

// --- 4. SECURE APPROVAL ROUTE ---
app.get('/approve', async (req, res) => {
    const { email, token } = req.query;

    if (token !== SECRET_TOKEN) {
        return res.status(403).send("Invalid token.");
    }

    const volunteerID = `OEF-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
        // Send Approval Notification
        await resend.emails.send({
            from: 'O.E.F Administration <onboarding@resend.dev>',
            to: email,
            subject: "Congratulations! Your Application has been Approved",
            html: `
            <div style="font-family: 'Montserrat', sans-serif; color: #1B120F;">
            <img src="${logoURL}" alt="O.E.F Logo" style="width: 80px; margin-bottom: 20px;">
                <h2 style="color: #D4AF37;">Welcome to theOnakpa Emmanuel Foundation</h2>
                <p>Dear Volunteer,</p>
                <p>We are pleased to inform you that your application to the <strong>Onakpa Emmanuel Foundation</strong> has been reviewed and <strong>APPROVED</strong>.</p>
                <p>Your profile has been added to our Global Archive, and a coordinator will reach out to you shortly regarding next steps.</p>
                <br>
                <p>Best Regards,</p>
                <p><strong>The O.E.F Administration Team</strong></p>
                <hr style="border: 0; border-top: 1px solid #D4AF37;">
                <small>Onakpa Emmanuel Foundation • ...we split the seas, so you can walk right through it</small>
            </div>
        `
    });

        // Send ID Card Email
        await resend.emails.send({
            from: 'O.E.F Archive <onboarding@resend.dev>',
            to: email,
            subject: "OFFICIAL DIGITAL ID: Onakpa Emmanuel Foundation",
             html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <img src="${logoURL}" alt="O.E.F Logo" style="width: 80px; margin-bottom: 20px;">
                <div id="id-card" style="width: 350px; margin: auto; background: #1B120F; border: 2px solid #D4AF37; padding: 20px; color: #F5F5DC; border-radius: 10px;">
                    <h2 style="color: #D4AF37; margin: 0;">O.E.F</h2>
                    <p style="font-size: 10px; letter-spacing: 3px;">GLOBAL ARCHIVE</p>
                    <hr border="1" color="#D4AF37">
                    <h3 style="margin: 20px 0 5px 0;">OFFICIAL VOLUNTEER</h3>
                    <p style="font-size: 14px; color: #D4AF37;">${email}</p>
                    <p style="font-size: 12px;">ID: ${volunteerID}</p>
                    <p style="font-size: 10px; margin-top: 20px; opacity: 0.7;">Transcending Borders Through Service</p>
                </div>
                <br>
                <a href="https://onakpa-foundation.onrender.com/download-id?email=${encodeURIComponent(email)}&id=${volunteerID}" 
                   style="background: #D4AF37; color: #1B120F; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   DOWNLOAD ID CARD (PDF)
                </a>
            </div>
        `
        });

        res.send(`<h1 style="color:gold; text-align:center;">Approval & ID Sent to ${email}</h1>`);

    } catch (error) {
        console.error('Resend Approval Error:', error);
        res.status(500).send("Error sending approval emails.");
    }
});

// --- 5. PRINTABLE ID ROUTE ---
const logoURL = 'https://onakpaemmanuelfoundation.org/assets/logo.png';
    // Chain the emails
        await resend.emails.send(mail1);
        await resend.emails.send(mail2);

app.get('/download-id', (req, res) => {
    const { email, id } = req.query;
    res.send(`
        <html>
            <body onload="window.print()">
                <div style="width: 400px; height: 250px; background: #1B120F; color: #F5F5DC; border: 5px solid #D4AF37; padding: 20px; margin: 50px auto; text-align: center; font-family: sans-serif;">
                <img src="${logoURL}" alt="O.E.F Logo" style="width: 80px; margin-bottom: 20px;">
                    <h1 style="color: #D4AF37;">O.E.F</h1>
                    <p>OFFICIAL VOLUNTEER ID</p>
                    <h2 style="margin: 30px 0;">${email}</h2>
                    <p style="color: #D4AF37;">ID NO: ${id}</p>
                    <p style="font-size: 10px; margin-top: 40px;">Onakpa Emmanuel Foundation Archive © 2025</p>
                </div>
                <p style="text-align:center; font-family:sans-serif;">If the print dialog didn't open, press <b>Ctrl + P</b> to save as PDF.</p>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`✅ Server Active: http://localhost:${PORT}`);
});
