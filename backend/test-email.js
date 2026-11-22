const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { sendTaskAssignmentEmail, getTransporter } = require("./src/services/email.services");

const recipient = process.argv[2] || process.env.GMAIL_USER;

console.log("=========================================");
console.log("   KanbanFlow Gmail SMTP Diagnostic");
console.log("=========================================");
console.log("GMAIL_USER         :", process.env.GMAIL_USER || "(NOT SET ❌)");
console.log("GMAIL_APP_PASSWORD :", process.env.GMAIL_APP_PASSWORD ? "****** (CONFIGURED ✅)" : "(NOT SET ❌)");

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.log("\n❌ Error: GMAIL_USER ya GMAIL_APP_PASSWORD backend/.env me khali hai!");
  console.log("   Gmail se email bhejne ke liye Google Account me jakar 16-character App Password banayein");
  console.log("   aur backend/.env me set karein.");
  console.log("=========================================\n");
  process.exit(0);
}

if (!recipient) {
  console.log("\n❌ Please provide a recipient email: node test-email.js your_test_email@gmail.com");
  process.exit(0);
}

console.log(`\n⏳ Attempting to send test email to: ${recipient}...`);

sendTaskAssignmentEmail({
  assigneeEmail: recipient,
  assigneeName: "Kanban User",
  assignorName: "KanbanFlow System",
  taskTitle: "Test Notification - Gmail Verification",
  taskDescription: "Badhai ho! Aapka Gmail notification system successfully setup ho gaya hai. Ab task assign hone par aur workspace invite aane par instant email notifications milenge! 🚀",
  boardName: "Sprint 1",
  workspaceName: "My Workspace",
}).then((res) => {
  if (res.success) {
    console.log("\n🎉 SUCCESS! Test email bhej diya gaya hai!");
    console.log("   Kripya apne Gmail inbox (ya spam folder) me check karein.");
    console.log("   Message ID:", res.messageId);
  } else {
    console.log("\n❌ Email send fail hua:");
    console.log("   Reason / Error:", res.error || res.reason);
    if (res.error && res.error.includes("Invalid login")) {
      console.log("\n💡 TIP: 'Invalid login' ka matlab hai:");
      console.log("   1. Aapne apna regular Gmail login password daala hai, jabki 16-digit App Password chahiye.");
      console.log("   2. Ya Google Account me 2-Step Verification off hai.");
    }
  }
  console.log("=========================================\n");
});
