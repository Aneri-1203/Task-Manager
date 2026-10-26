const nodemailer = require("nodemailer");

// ==================================================
// Nodemailer Transporter Configuration
// ==================================================

function createTransporter() {
    const service = process.env.EMAIL_SERVICE; // e.g. 'gmail'
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (service) {
        return nodemailer.createTransport({
            service,
            auth: { user, pass },
        });
    }

    if (host && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
    }

    return null;
}

const transporter = createTransporter();

/**
 * Helper to safely send email with console fallback if SMTP is not configured.
 */
async function sendMailSafe(mailOptions) {
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || "Task Manager <noreply@taskmanager.com>";
    const options = {
        from: fromAddress,
        ...mailOptions,
    };

    if (transporter && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            const info = await transporter.sendMail(options);
            console.log(`[Email Sent] Message ID: ${info.messageId} to ${options.to}`);
            return { success: true, info };
        } catch (error) {
            console.error(`[Email Failed] Error sending email to ${options.to}:`, error.message);
            return { success: false, error: error.message };
        }
    } else {
        // Fallback for development / when SMTP credentials are not yet configured in .env
        console.log("--------------------------------------------------");
        console.log("[SMTP Notification - Dev Mode / Simulated Email]");
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message Body (Preview):\n${options.text || "(HTML Content sent)"}`);
        console.log("--------------------------------------------------");
        return { success: true, simulated: true };
    }
}

// ==================================================
// Send Task Completion Email
// ==================================================
async function sendTaskCompletedEmail(user, task) {
    if (!user || !user.email) return;

    const recipientName = user.username || "Valued User";
    const taskTitle = task.title || "Untitled Task";
    const taskDescription = task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : "";
    const taskPriority = (task.priority || "medium").toUpperCase();
    const completedAt = new Date().toLocaleString();

    const subject = `Task Completed: "${taskTitle}"`;

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Task Completed!</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Task Management System Notification</p>
        </div>
        <div style="padding: 28px; color: #334155; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0;">Hi <strong>${recipientName}</strong>,</p>
            <p style="font-size: 15px;">Great job! You have successfully completed the following task:</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">${taskTitle}</h3>
                ${taskDescription}
                <p style="margin: 4px 0;"><strong>Priority:</strong> <span style="display:inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: #e0e7ff; color: #4338ca; font-weight: 600;">${taskPriority}</span></p>
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;"><strong>Completed At:</strong> ${completedAt}</p>
            </div>

            <p style="font-size: 14px; color: #64748b;">Keep up the great momentum!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                Task Management System &bull; Auto-generated email
            </p>
        </div>
    </div>
    `;

    const text = `Hi ${recipientName},\n\nYour task "${taskTitle}" has been marked as completed!\nPriority: ${taskPriority}\nCompleted At: ${completedAt}\n\nTask Management System`;

    return sendMailSafe({
        to: user.email,
        subject,
        text,
        html,
    });
}

// ==================================================
// Send Password Reset Email
// ==================================================
async function sendPasswordResetEmail(user, resetUrl) {
    if (!user || !user.email) return;

    const recipientName = user.username || "User";
    const subject = "Password Reset Request - Task Management System";

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Reset Your Password</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Task Management System</p>
        </div>
        <div style="padding: 28px; color: #334155; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0;">Hi <strong>${recipientName}</strong>,</p>
            <p style="font-size: 15px;">We received a request to reset your password. Click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                    Reset Password
                </a>
            </div>

            <p style="font-size: 13px; color: #64748b;">Or copy and paste this URL into your browser:<br/><a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a></p>
            
            <p style="font-size: 13px; color: #ef4444; margin-top: 20px;">
                <strong>Note:</strong> This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                Task Management System &bull; Secure Authentication
            </p>
        </div>
    </div>
    `;

    const text = `Hi ${recipientName},\n\nYou requested a password reset. Please use the following link to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nTask Management System`;

    return sendMailSafe({
        to: user.email,
        subject,
        text,
        html,
    });
}

module.exports = {
    sendTaskCompletedEmail,
    sendPasswordResetEmail,
};
