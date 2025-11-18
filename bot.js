const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const fs = require("fs");
const http = require("http");
const { exec } = require("child_process");

// הגדרות שרת QR
const QR_PORT = 5556;
let qrServer = null;
let currentQRCode = null;

// יצירת לקוח WhatsApp עם אימות מקומי (שומר את ההתחברות)
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
  // אופטימיזציות למהירות
  webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
  },
});

// פונקציה ליצירת שרת QR זמני
function startQRServer() {
  return new Promise((resolve) => {
    qrServer = http.createServer(async (req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });

        if (currentQRCode) {
          try {
            // המרת QR לתמונה base64
            const qrImage = await QRCode.toDataURL(currentQRCode, {
              width: 400,
              margin: 2,
            });

            const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR Code - QuizSense Bot</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      background: rgba(255, 255, 255, 0.95);
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 500px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .qr-container {
      background: white;
      padding: 20px;
      border-radius: 15px;
      display: inline-block;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    img {
      display: block;
      border-radius: 10px;
    }
    .instructions {
      margin-top: 30px;
      color: #444;
      text-align: right;
      line-height: 1.8;
    }
    .step {
      background: #f0f0f0;
      padding: 12px;
      margin: 10px 0;
      border-radius: 8px;
      border-right: 4px solid #667eea;
    }
    .footer {
      margin-top: 20px;
      color: #888;
      font-size: 14px;
    }
    .spinner {
      margin-top: 20px;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 QuizSense WhatsApp Bot</h1>
    <p class="subtitle">סרוק את הקוד להתחברות</p>

    <div class="qr-container">
      <img src="${qrImage}" alt="WhatsApp QR Code" />
    </div>

    <div class="instructions">
      <div class="step">📱 <strong>שלב 1:</strong> פתח את WhatsApp בטלפון</div>
      <div class="step">⚙️ <strong>שלב 2:</strong> עבור להגדרות > מכשירים מקושרים</div>
      <div class="step">📷 <strong>שלב 3:</strong> לחץ על "קשר מכשיר" וסרוק את הקוד</div>
    </div>

    <div class="spinner">⏳ ממתין לסריקה...</div>
    <div class="footer">הדף יסגר אוטומטית לאחר התחברות מוצלחת</div>
  </div>

  <script>
    // בדיקה כל 2 שניות אם השרת עדיין פעיל
    const checkInterval = setInterval(() => {
      fetch('/ping').catch(() => {
        // השרת נסגר - הסריקה הצליחה!
        clearInterval(checkInterval);
        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h1 style="color:#4CAF50;">✅ התחברות הצליחה!</h1><p>הדף ייסגר עכשיו...</p></div>';
        setTimeout(() => window.close(), 2000);
      });
    }, 2000);
  </script>
</body>
</html>`;
            res.end(html);
          } catch (err) {
            res.end("<h1>שגיאה ביצירת QR Code</h1>");
          }
        } else {
          res.end("<h1>אין QR Code זמין כרגע</h1>");
        }
      } else if (req.url === "/ping") {
        res.writeHead(200);
        res.end("OK");
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    qrServer.listen(QR_PORT, () => {
      console.log(`\n🌐 שרת QR פועל על: http://localhost:${QR_PORT}`);
      resolve();
    });
  });
}

// פונקציה לסגירת שרת QR
function stopQRServer() {
  if (qrServer) {
    qrServer.close(() => {
      console.log("🔒 שרת QR נסגר");
    });
    qrServer = null;
    currentQRCode = null;
  }
}

// הגדרות הבוט
const CONFIG = {
  // שם הקבוצה שהבוט יקשיב לה (החלף בשם הקבוצה שלך)
  TARGET_GROUP_NAME: "QuizSense",

  // מילות מפתח ותגובות (לא כולל פקודות עם !)
  RESPONSES: {
    שלום: "שלום! איך אפשר לעזור?",
    היי: "היי! מה נשמע?",
    תודה: "בבקשה! תמיד כאן לעזור 😊",
  },
};

// אירוע: יצירת QR Code לסריקה
client.on("qr", async (qr) => {
  console.log("📱 סרוק את קוד ה-QR בעזרת WhatsApp:");
  qrcode.generate(qr, { small: true });

  // שמירת ה-QR הנוכחי
  currentQRCode = qr;

  // הפעלת שרת QR
  await startQRServer();

  // פתיחת הדפדפן אוטומטית
  const url = `http://localhost:${QR_PORT}`;
  console.log(`\n🌐 פותח דפדפן: ${url}`);

  // פקודת פתיחת דפדפן לפי מערכת הפעלה
  const command =
    process.platform === "win32"
      ? `start ${url}`
      : process.platform === "darwin"
      ? `open ${url}`
      : `xdg-open ${url}`;

  exec(command, (err) => {
    if (err) {
      console.log(`\n⚠️  לא ניתן לפתוח דפדפן אוטומטית. פתח ידנית: ${url}`);
    }
  });

  console.log(
    "\n🔍 פתח את WhatsApp בטלפון > הגדרות > מכשירים מקושרים > קשר מכשיר"
  );
});

// אירוע: הבוט מוכן לפעולה
client.on("ready", () => {
  console.log("✅ הבוט מחובר ומוכן לפעולה!");
  console.log("🤖 מקשיב לקבוצה:", CONFIG.TARGET_GROUP_NAME);
});

// אירוע: טעינת אימות
client.on("loading_screen", (percent, message) => {
  console.log("⏳ טוען...", percent, message);
});

// אירוע: אימות הצליח
client.on("authenticated", () => {
  console.log("🔐 אימות הצליח!");

  // סגירת שרת QR אחרי התחברות מוצלחת
  stopQRServer();

  // מחיקת קובץ ה-QR אם קיים (מגירסאות ישנות)
  const qrImagePath = "./whatsapp-qr.png";
  if (fs.existsSync(qrImagePath)) {
    fs.unlinkSync(qrImagePath);
    console.log("🗑️  קובץ QR נמחק (כבר לא נדרש)");
  }
});

// אירוע: כשל באימות
client.on("auth_failure", (msg) => {
  console.error("❌ כשל באימות:", msg);
});

// אירוע: התנתקות
client.on("disconnected", (reason) => {
  console.log("⚠️ הבוט התנתק:", reason);
});

// אירוע: קבלת הודעה
client.on("message", async (message) => {
  try {
    // בדיקה מהירה - רק הודעות חדשות (לא מההיסטוריה)
    if (!message.fromMe && message.timestamp) {
      const messageAge = Date.now() / 1000 - message.timestamp;
      if (messageAge > 60) return; // מתעלם מהודעות ישנות מדקה
    }

    // קבלת מידע על הצ'אט
    const chat = await message.getChat();

    // בדיקה אם זו קבוצה
    if (!chat.isGroup) {
      return; // מתעלם מהודעות פרטיות
    }

    // בדיקה אם זו הקבוצה הנכונה
    if (chat.name !== CONFIG.TARGET_GROUP_NAME) {
      return; // מתעלם מקבוצות אחרות
    }

    // לוג הודעה
    const contact = await message.getContact();
    console.log(`\n📨 הודעה חדשה מ-${contact.pushname || contact.number}:`);
    console.log(`   בקבוצה: ${chat.name}`);
    console.log(`   תוכן: ${message.body}`);

    // בדיקת תגובות אוטומטיות
    const messageText = message.body.trim();

    // אם זו פקודה (מתחילה ב-!), טפל בה ישירות
    if (messageText.startsWith("!")) {
      await handleCommand(message, messageText);
      return; // עוצר כאן, לא ממשיך לתגובות אוטומטיות
    }

    // חיפוש תגובה מתאימה (רק אם זו לא פקודה)
    for (const [keyword, response] of Object.entries(CONFIG.RESPONSES)) {
      if (messageText.toLowerCase().includes(keyword.toLowerCase())) {
        console.log(`   ✉️ שולח תגובה: ${response}`);

        // שליחת תגובה
        await message.reply(response);
        break; // עוצר אחרי התגובה הראשונה
      }
    }
  } catch (error) {
    console.error("❌ שגיאה בעיבוד הודעה:", error);
  }
});

// פונקציה לטיפול בפקודות מיוחדות
async function handleCommand(message, command) {
  switch (command.toLowerCase()) {
    case "!bot":
      // הצגת כל הפקודות הזמינות
      const botHelp =
        `🤖 *רשימת פקודות הבוט:*\n\n` +
        `!bot - הצגת רשימה זו\n` +
        `!git - קישורים לפרויקט GitHub והתיעוד\n` +
        `!env - מידע על סביבת הריצה\n\n` +
        `💬 *מילות מפתח:*\n` +
        `שלום, היי, תודה`;
      await message.reply(botHelp);
      break;

    case "!git":
      // קישור ל-GitHub
      const gitText =
        `💻 *GitHub Repository*\n\n` +
        `🔗 https://github.com/166sus122/QuizSense\n\n` +
        `📦 הפרויקט QuizSense`;
      await message.reply(gitText);
      break;

    case "!env":
      // הצגת תוכן .env.example
      const envContent = `# QuizSense Environment Variables
# Copy this file to .env and update with your values

# Security Keys (MUST CHANGE IN PRODUCTION!)
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET_KEY=your-jwt-secret-key-change-this

# Redis
REDIS_PASSWORD=your-redis-password

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=your-grafana-password

# MySQL
MYSQL_PASSWORD=strong-user-password
MYSQL_ROOT_PASSWORD=strong-root-password
MYSQL_DATABASE=quizsense
MYSQL_USER=quizuser

# Timezone
TZ=Asia/Jerusalem

# Email (for Fail2ban notifications)
FAIL2BAN_EMAIL=admin@quizsense.com

# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
ENVIRONMENT=local
USE_SSL=false

# Google OAuth
GOOGLE_CLIENT_ID=1078093029592-fqp0n35g3tciqueugvgk3obqecdgo40u.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Quiz Generator - OpenRouter API
# Get your API key from: https://openrouter.ai/
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_FALLBACK_MODEL=mistralai/mixtral-8x7b-instruct
OPENROUTER_API_BASE_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_TOP_P=0.9
MAX_RETRIES=3

# Supabase Database (PostgreSQL) - REMOVED - Now using MySQL
# All Supabase configurations have been removed and replaced with MySQL`;

      await message.reply(
        `📄 *QuizSense Environment Variables*\n\n\`\`\`${envContent}\`\`\``
      );
      break;

    default:
      // פקודה לא מוכרת - לא עושים כלום
      break;
  }
}

// אירוע: הודעה נוצרה (כולל הודעות שהבוט שולח)
client.on("message_create", async (message) => {
  // אפשר להוסיף לוגיקה נוספת כאן
});

// טיפול בשגיאות כלליות
process.on("unhandledRejection", (error) => {
  console.error("❌ שגיאה לא מטופלת:", error);
});

// התחלת הבוט
console.log("🚀 מפעיל את הבוט...");
client.initialize();
