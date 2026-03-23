// backend/index.js
require("dotenv").config();
const fastify = require("fastify");
const cors = require("@fastify/cors");
const fastifyCookie = require("@fastify/cookie");
const { Resend } = require("resend");

const app = fastify({ logger: true });


async function sendEmail(to, subject, htmlContent) {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: process.env.SMTP_EMAIL || 'onboarding@resend.dev',
            to,
            subject,
            html: htmlContent,
        });

        if (error) {
            console.error("Resend API Error:", error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error("Error sending email via Resend:", error);
        throw error;
    }
}

/* -------------------- CONTENT PARSER -------------------- */
app.addContentTypeParser("*", { parseAs: "buffer" }, function (req, body, done) {
    try {
        req.rawBody = body;
        done(null, body);
    } catch (err) {
        done(err, null);
    }
});

/* -------------------- MIDDLEWARE -------------------- */
app.register(cors, {
    origin: [/localhost/, /\.distinctcomm\.co\.in$/], 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
});

app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || "dev_secret",
});

/* -------------------- ROUTES -------------------- */


app.post("/api/contact", async (req, reply) => {
    try {
        const { userEmail, subject, customField, message } = req.body;

        if (!userEmail || !subject || !message) {
            return reply.code(400).send({ ok: false, error: "Missing required fields" });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            console.error("ADMIN_EMAIL is not set");
            return reply.code(500).send({ ok: false, error: "Server Configuration Error" });
        }

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #f15a24; border-bottom: 2px solid #f15a24; padding-bottom: 10px;">New Contact Form Submission</h2>
                <p><strong>From:</strong> ${userEmail}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                ${customField ? `<p><strong>Custom Reference:</strong> ${customField}</p>` : ''}
                <br>
                <h3>Message:</h3>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${message}</div>
            </div>
        `;

        await sendEmail(adminEmail, `New Submission: ${subject}`, htmlContent);
        return reply.send({ ok: true });
    } catch (err) {
        console.error("Contact Form error:", err);
        return reply.code(500).send({ ok: false, error: err.message || "Email failed to send" });
    }
});

app.get("/", async () => "hello there pleae fuck off");

app.get("/health", async () => ({ ok: true, service: "backend" }));

/* -------------------- START -------------------- */
const PORT = Number(process.env.PORT || 5001);
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Backend service running on port ${PORT}`);
});
