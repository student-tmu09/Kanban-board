const nodemailer = require("nodemailer");

/**
 * Creates Nodemailer transporter for Gmail
 */
const getTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ""), // Gmail app passwords may have spaces
    },
  });
};

/**
 * Sends a stylized email notification when a task is assigned to a user
 */
const sendTaskAssignmentEmail = async ({
  assigneeEmail,
  assigneeName,
  assignorName,
  taskTitle,
  taskDescription,
  dueDate,
  boardName,
  boardId,
  workspaceName,
}) => {
  if (!assigneeEmail) {
    console.warn("[Email Service] No assignee email provided, skipping.");
    return { success: false, reason: "NO_EMAIL" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "⚠️ [Email Service] GMAIL_USER or GMAIL_APP_PASSWORD is not configured in backend/.env.\n" +
      "   To enable Gmail notifications, add:\n" +
      "   GMAIL_USER=yourgmail@gmail.com\n" +
      "   GMAIL_APP_PASSWORD=your_16_char_app_password\n" +
      "   in your backend/.env file."
    );
    return { success: false, reason: "GMAIL_NOT_CONFIGURED" };
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const boardUrl = boardId ? `${clientUrl}/board/${boardId}` : `${clientUrl}/dashboard`;

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "No due date";

  const subject = `📋 Task Assigned: "${taskTitle}" (${boardName || "Kanban"})`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 20px;
          color: #1e293b;
        }
        .container {
          max-width: 580px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 28px 24px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 28px 24px;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .subtext {
          font-size: 14px;
          color: #475569;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .task-card {
          background-color: #f8fafc;
          border-left: 4px solid #6366f1;
          border-radius: 6px;
          padding: 16px 18px;
          margin-bottom: 24px;
        }
        .task-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        .task-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 12px 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .meta-table td {
          padding: 4px 0;
          color: #475569;
        }
        .meta-label {
          font-weight: 600;
          color: #64748b;
          width: 110px;
        }
        .action-wrap {
          text-align: center;
          margin: 28px 0 16px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          padding: 12px 28px;
          border-radius: 8px;
          box-shadow: 0 3px 8px rgba(79, 70, 229, 0.3);
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding: 16px 24px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          background-color: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KanbanFlow</h1>
          <p>Task Assignment Notification</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${assigneeName || "there"},</div>
          <p class="subtext">
            <strong>${assignorName || "A team member"}</strong> has assigned a task to you in 
            <strong>${workspaceName ? workspaceName + " / " : ""}${boardName || "Board"}</strong>.
          </p>

          <div class="task-card">
            <h2 class="task-title">${taskTitle}</h2>
            ${taskDescription ? `<p class="task-desc">${taskDescription}</p>` : ""}
            <table class="meta-table">
              ${workspaceName ? `<tr><td class="meta-label">Workspace:</td><td>${workspaceName}</td></tr>` : ""}
              ${boardName ? `<tr><td class="meta-label">Board:</td><td>${boardName}</td></tr>` : ""}
              <tr><td class="meta-label">Due Date:</td><td>${formattedDueDate}</td></tr>
              <tr><td class="meta-label">Assigned by:</td><td>${assignorName || "Team"}</td></tr>
            </table>
          </div>

          <div class="action-wrap">
            <a href="${boardUrl}" class="cta-button" target="_blank">View Task on Board &rarr;</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from KanbanFlow. You received this because you were assigned a task.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${assigneeName || ""},

${assignorName || "A team member"} has assigned a new task to you:
Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}\n` : ""}
Board: ${boardName || "Kanban Board"}
Due Date: ${formattedDueDate}

View task: ${boardUrl}
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"KanbanFlow Notifications" <${process.env.GMAIL_USER}>`,
      to: assigneeEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`📧 [Email Service] Assignment email sent to ${assigneeEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [Email Service] Failed to send email to ${assigneeEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Sends a stylized email invitation to join a workspace
 */
const sendWorkspaceInviteEmail = async ({
  inviteeEmail,
  inviteeName,
  inviterName,
  workspaceName,
  workspaceId,
  role = "MEMBER",
  isNewUser = false,
  tempPassword = null,
}) => {
  if (!inviteeEmail) {
    console.warn("[Email Service] No invitee email provided, skipping.");
    return { success: false, reason: "NO_EMAIL" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "⚠️ [Email Service] GMAIL_USER or GMAIL_APP_PASSWORD is not configured in backend/.env.\n" +
      "   To enable Gmail notifications, add:\n" +
      "   GMAIL_USER=yourgmail@gmail.com\n" +
      "   GMAIL_APP_PASSWORD=your_16_char_app_password\n" +
      "   in your backend/.env file."
    );
    return { success: false, reason: "GMAIL_NOT_CONFIGURED" };
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const targetUrl = workspaceId ? `${clientUrl}/workspace/${workspaceId}` : `${clientUrl}/dashboard`;

  const subject = `🎉 You've been invited to join "${workspaceName}" on KanbanFlow`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 20px;
          color: #1e293b;
        }
        .container {
          max-width: 580px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 28px 24px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 28px 24px;
        }
        .greeting {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .subtext {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 22px;
        }
        .invite-card {
          background-color: #f8fafc;
          border-left: 4px solid #6366f1;
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        .workspace-name {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 10px 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .meta-table td {
          padding: 5px 0;
          color: #475569;
        }
        .meta-label {
          font-weight: 600;
          color: #64748b;
          width: 120px;
        }
        .credentials-box {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 14px 16px;
          margin: 20px 0;
          font-size: 13px;
          color: #1e40af;
          line-height: 1.5;
        }
        .credentials-box strong {
          color: #1e3a8a;
        }
        .code-pill {
          background-color: #dbeafe;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 600;
          color: #1e40af;
        }
        .action-wrap {
          text-align: center;
          margin: 28px 0 16px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          padding: 12px 32px;
          border-radius: 8px;
          box-shadow: 0 3px 8px rgba(79, 70, 229, 0.3);
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding: 16px 24px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          background-color: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KanbanFlow</h1>
          <p>Workspace Team Invitation</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${inviteeName || "there"},</div>
          <p class="subtext">
            <strong>${inviterName || "A team member"}</strong> has invited you to join the
            <strong>${workspaceName}</strong> workspace on KanbanFlow as an <strong>${role}</strong>.
          </p>

          <div class="invite-card">
            <h2 class="workspace-name">📁 ${workspaceName}</h2>
            <table class="meta-table">
              <tr><td class="meta-label">Invited by:</td><td>${inviterName || "Workspace Admin"}</td></tr>
              <tr><td class="meta-label">Assigned Role:</td><td><strong>${role}</strong></td></tr>
              <tr><td class="meta-label">Invited Email:</td><td>${inviteeEmail}</td></tr>
            </table>
          </div>

          ${
            isNewUser && tempPassword
              ? `
            <div class="credentials-box">
              <strong>✨ New to KanbanFlow?</strong> An account has been created for your email.
              <br/>You can log in directly with:
              <br/>• Email: <strong>${inviteeEmail}</strong>
              <br/>• Temporary Password: <span class="code-pill">${tempPassword}</span>
              <br/><br/>
              <em>You can also simply sign up with your email anytime to set your own custom password.</em>
            </div>
            `
              : ""
          }

          <div class="action-wrap">
            <a href="${targetUrl}" class="cta-button" target="_blank">Accept & Open Workspace &rarr;</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated invitation from KanbanFlow. If you believe you received this in error, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${inviteeName || ""},

${inviterName || "A team member"} has invited you to collaborate in the workspace "${workspaceName}" as an ${role}.

Workspace: ${workspaceName}
Invited by: ${inviterName || "Workspace Admin"}
Role: ${role}
${isNewUser && tempPassword ? `Temporary Password: ${tempPassword}\n` : ""}
Join now: ${targetUrl}
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"KanbanFlow Workspace" <${process.env.GMAIL_USER}>`,
      to: inviteeEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`📧 [Email Service] Workspace invitation email sent to ${inviteeEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [Email Service] Failed to send invite email to ${inviteeEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Sends a stylized OTP verification email for registration
 */
const sendOtpEmail = async ({ email, name, otp }) => {
  if (!email || !otp) {
    console.warn("[Email Service] Missing email or OTP, skipping.");
    return { success: false, reason: "MISSING_PARAMS" };
  }

  // Always log OTP in console so during development the user can also see it
  console.log(`\n=========================================`);
  console.log(`🔑 [OTP SERVICE] Verification code for ${email}: ${otp}`);
  console.log(`=========================================\n`);

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "⚠️ [Email Service] GMAIL_USER or GMAIL_APP_PASSWORD is not configured in backend/.env.\n" +
      "   OTP is logged in console above for testing."
    );
    return { success: false, reason: "GMAIL_NOT_CONFIGURED", otp };
  }

  const subject = `🔐 Your Verification Code: ${otp} - KanbanFlow`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 24px;
          color: #1e293b;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 32px 24px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.92;
        }
        .content {
          padding: 32px 28px;
          text-align: center;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0f172a;
          text-align: left;
        }
        .subtext {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 26px;
          text-align: left;
        }
        .otp-card {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 2px dashed #6366f1;
          border-radius: 12px;
          padding: 20px 24px;
          margin: 0 auto 24px auto;
          display: inline-block;
          min-width: 220px;
        }
        .otp-code {
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 38px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #4f46e5;
          margin: 0;
          padding-left: 8px;
        }
        .otp-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #64748b;
          margin-top: 6px;
          font-weight: 600;
        }
        .warning-box {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #92400e;
          line-height: 1.5;
          text-align: left;
          margin-bottom: 24px;
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding: 18px 24px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          background-color: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KanbanFlow</h1>
          <p>Email Address Verification</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || "there"},</div>
          <p class="subtext">
            Thank you for registering on <strong>KanbanFlow</strong>. To verify your Gmail address and complete your registration, please enter the following 6-digit One-Time Password (OTP):
          </p>

          <div class="otp-card">
            <h2 class="otp-code">${otp}</h2>
            <div class="otp-label">One-Time Password</div>
          </div>

          <div class="warning-box">
            ⏱️ <strong>This OTP is valid for 10 minutes.</strong>
            <br/>For your security, never share this code with anyone.
          </div>
        </div>
        <div class="footer">
          <p>If you did not request this verification code, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name || ""},

Your KanbanFlow verification code is: ${otp}

This OTP is valid for 10 minutes. Do not share this code with anyone.

If you did not request this email, please ignore it.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"KanbanFlow Verification" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`📧 [Email Service] OTP verification email sent to ${email} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [Email Service] Failed to send OTP email to ${email}:`, err.message);
    return { success: false, error: err.message, otp };
  }
};

/**
 * Sends a stylized email notification to the task creator when a task is moved to DONE / completed
 */
const sendTaskCompletedEmail = async ({
  creatorEmail,
  creatorName,
  completedByName,
  taskTitle,
  taskDescription,
  boardName,
  boardId,
  workspaceName,
  completionProof = null,
}) => {
  if (!creatorEmail) {
    console.warn("[Email Service] No creator email provided, skipping.");
    return { success: false, reason: "NO_EMAIL" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "⚠️ [Email Service] GMAIL_USER or GMAIL_APP_PASSWORD is not configured in backend/.env.\n" +
      "   To enable Gmail notifications, add GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env."
    );
    return { success: false, reason: "GMAIL_NOT_CONFIGURED" };
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const boardUrl = boardId ? `${clientUrl}/board/${boardId}` : `${clientUrl}/dashboard`;

  const subject = `🎉 Task Completed: "${taskTitle}" is now Finished!`;

  const completedAtFormatted = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const hasProof = completionProof && (completionProof.note || completionProof.fileUrl);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 20px;
          color: #1e293b;
        }
        .container {
          max-width: 580px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
          padding: 28px 24px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.92;
        }
        .content {
          padding: 28px 24px;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .subtext {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 22px;
        }
        .task-card {
          background-color: #f0fdf4;
          border-left: 4px solid #10b981;
          border-radius: 8px;
          padding: 18px 20px;
          margin-bottom: 20px;
        }
        .status-badge {
          display: inline-block;
          background-color: #d1fae5;
          color: #065f46;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .task-title {
          font-size: 17px;
          font-weight: 700;
          color: #064e3b;
          margin: 0 0 8px 0;
        }
        .task-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 14px 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .meta-table td {
          padding: 4px 0;
          color: #475569;
        }
        .meta-label {
          font-weight: 600;
          color: #64748b;
          width: 120px;
        }
        .proof-box {
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .proof-header {
          font-weight: 700;
          color: #065f46;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .proof-note {
          font-size: 13px;
          color: #047857;
          margin: 0 0 10px 0;
          line-height: 1.5;
          background: #ffffff;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #d1fae5;
          font-style: italic;
        }
        .proof-att {
          font-size: 13px;
          color: #065f46;
        }
        .action-wrap {
          text-align: center;
          margin: 28px 0 16px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          padding: 12px 30px;
          border-radius: 8px;
          box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding: 16px 24px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          background-color: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KanbanFlow</h1>
          <p>Task Completed Notification</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${creatorName || "there"},</div>
          <p class="subtext">
            Good news! The task you created on KanbanFlow has been moved to the <strong>Completed (Done)</strong> column.
          </p>

          <div class="task-card">
            <span class="status-badge">✅ Completed / Done</span>
            <h2 class="task-title">${taskTitle}</h2>
            ${taskDescription ? `<p class="task-desc">${taskDescription}</p>` : ""}
            <table class="meta-table">
              ${workspaceName ? `<tr><td class="meta-label">Workspace:</td><td>${workspaceName}</td></tr>` : ""}
              ${boardName ? `<tr><td class="meta-label">Board:</td><td>${boardName}</td></tr>` : ""}
              <tr><td class="meta-label">Completed by:</td><td><strong>${completedByName || "A team member"}</strong></td></tr>
              <tr><td class="meta-label">Completed at:</td><td>${completedAtFormatted}</td></tr>
            </table>
          </div>

          ${
            hasProof
              ? `
            <div class="proof-box">
              <div class="proof-header">📋 Work Completion Proof:</div>
              ${
                completionProof.note
                  ? `<div class="proof-note">"${completionProof.note}"</div>`
                  : ""
              }
              ${
                completionProof.fileUrl
                  ? `
                <div class="proof-att">
                  <b>📎 Attached Proof:</b> ${completionProof.fileName || "Completion File"}
                  ${
                    completionProof.fileType?.startsWith("image/") ||
                    completionProof.fileUrl?.startsWith("data:image/") ||
                    /\.(png|jpe?g|webp|gif)$/i.test(completionProof.fileUrl)
                      ? `<div style="margin-top: 10px;"><img src="${completionProof.fileUrl}" alt="Proof" style="max-width: 100%; max-height: 240px; border-radius: 6px; border: 1px solid #a7f3d0; object-fit: contain;" /></div>`
                      : `<div style="margin-top: 8px;"><a href="${completionProof.fileUrl}" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Open Attached Proof &rarr;</a></div>`
                  }
                </div>
                `
                  : ""
              }
              ${
                completionProof.linkUrl
                  ? `
                <div style="margin-top: 10px; font-size: 13px; color: #065f46;">
                  <b>🔗 Reference Link:</b> <a href="${completionProof.linkUrl}" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">${completionProof.linkUrl}</a>
                </div>
                `
                  : ""
              }
            </div>
            `
              : ""
          }

          <div class="action-wrap">
            <a href="${boardUrl}" class="cta-button" target="_blank">View Task on Board &rarr;</a>
          </div>
        </div>
        <div class="footer">
          <p>You received this email because you created this task on KanbanFlow.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${creatorName || ""},

The task you created has been completed!

Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}\n` : ""}
Status: DONE (Completed)
Completed by: ${completedByName || "A team member"}
Board: ${boardName || "Kanban Board"}
Workspace: ${workspaceName || ""}
${completionProof?.note ? `\nProof Note: "${completionProof.note}"` : ""}
${completionProof?.fileName ? `\nProof Attachment: ${completionProof.fileName}` : ""}

View task: ${boardUrl}
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"KanbanFlow Notifications" <${process.env.GMAIL_USER}>`,
      to: creatorEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`📧 [Email Service] Task completion email sent to creator ${creatorEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [Email Service] Failed to send completion email to ${creatorEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Sends a stylized 24-hour reminder email before task due date
 */
const sendTaskDueReminderEmail = async ({
  assigneeEmail,
  assigneeName,
  taskTitle,
  taskDescription,
  dueDate,
  boardName,
  boardId,
  workspaceName,
}) => {
  if (!assigneeEmail) {
    console.warn("[Email Service] No assignee email for due reminder, skipping.");
    return { success: false, reason: "NO_EMAIL" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, reason: "GMAIL_NOT_CONFIGURED" };
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const boardUrl = boardId ? `${clientUrl}/board/${boardId}` : `${clientUrl}/dashboard`;

  const formattedDueDateTime = dueDate
    ? new Date(dueDate).toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "In 24 hours";

  const subject = `⏰ Reminder: 24 Hours Remaining to Complete "${taskTitle}"`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 20px;
          color: #1e293b;
        }
        .container {
          max-width: 580px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          padding: 28px 24px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.95;
        }
        .content {
          padding: 28px 24px;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .subtext {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 22px;
        }
        .countdown-alert {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-left: 4px solid #f59e0b;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13.5px;
          color: #92400e;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .task-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 18px 20px;
          margin-bottom: 24px;
        }
        .task-title {
          font-size: 17px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        .task-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 14px 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .meta-table td {
          padding: 5px 0;
          color: #475569;
        }
        .meta-label {
          font-weight: 600;
          color: #64748b;
          width: 130px;
        }
        .highlight-due {
          color: #b45309;
          font-weight: 700;
        }
        .action-wrap {
          text-align: center;
          margin: 28px 0 16px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          padding: 12px 30px;
          border-radius: 8px;
          box-shadow: 0 3px 8px rgba(217, 119, 6, 0.3);
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding: 16px 24px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          background-color: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KanbanFlow</h1>
          <p>Task Deadline Reminder</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${assigneeName || "there"},</div>
          <p class="subtext">
            This is an urgent reminder that you have a task due in <strong>exact 24 hours</strong> on your Kanban board.
          </p>

          <div class="countdown-alert">
            ⏳ Exactly 24 hours remaining to finish and complete this task!
          </div>

          <div class="task-card">
            <h2 class="task-title">${taskTitle}</h2>
            ${taskDescription ? `<p class="task-desc">${taskDescription}</p>` : ""}
            <table class="meta-table">
              ${workspaceName ? `<tr><td class="meta-label">Workspace:</td><td>${workspaceName}</td></tr>` : ""}
              ${boardName ? `<tr><td class="meta-label">Board:</td><td>${boardName}</td></tr>` : ""}
              <tr><td class="meta-label">Exact Due Time:</td><td class="highlight-due">${formattedDueDateTime}</td></tr>
            </table>
          </div>

          <div class="action-wrap">
            <a href="${boardUrl}" class="cta-button" target="_blank">Open Board & Complete Task &rarr;</a>
          </div>
        </div>
        <div class="footer">
          <p>You received this automated reminder because you are assigned to this task on KanbanFlow.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${assigneeName || ""},

This is a reminder that you have a task due in exact 24 hours:

Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}\n` : ""}
Due Date & Time: ${formattedDueDateTime}
Board: ${boardName || "Kanban Board"}
Workspace: ${workspaceName || ""}

Please complete the task on time:
${boardUrl}
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"KanbanFlow Deadline Alerts" <${process.env.GMAIL_USER}>`,
      to: assigneeEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`📧 [Email Service] 24h Due Reminder email sent to ${assigneeEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [Email Service] Failed to send 24h reminder email to ${assigneeEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendTaskAssignmentEmail,
  sendWorkspaceInviteEmail,
  sendOtpEmail,
  sendTaskCompletedEmail,
  sendTaskDueReminderEmail,
  getTransporter,
};
