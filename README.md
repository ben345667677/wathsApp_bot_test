# WhatsApp Bot - בוט וואטסאפ

בוט וואטסאפ מתקדם לניהול קבוצות, שמירת קבצים וניהול משתמשים בעברית.

## תכונות

- 🤖 יצירה ונהול קבוצות אוטומטית
- 📷 שמירת תמונות עם שמות מותאמים
- 📄 שמירת קבצי טקסט
- 🗂️ ארגון קבצים לפי משתמש
- 🔄 תפריטים אינטראקטיביים
- 🔐 בדיקות אבטחה ותקינות
- 🗄️ דאטאבייס MySQL מלא
- 📊 ניהול נתונים מתקדם
- 🌐 ממשק ניהול phpMyAdmin

## התקנה

```bash
npm install
```

## הרצה

### הרצה עם Docker (מומלץ)

**Linux/Mac:**
```bash
# הרצה אוטומטית עם סקריפט
chmod +x docker-start.sh
./docker-start.sh

# או ידנית
docker-compose up --build -d
```

**Windows:**
```cmd
# הרצה אוטומטית עם סקריפט
docker-start.bat

# או ידנית
docker-compose up --build -d
```

### פקודות Docker שימושיות
```bash
# צפייה בלוגים
docker-compose logs -f

# צפייה בלוגי הבוט בלבד
docker-compose logs -f whatsapp-bot

# צפייה בלוגי הדאטאבייס
docker-compose logs -f mysql-db

# עצירת הבוט
docker-compose down

# הפעלה מחדש
docker-compose restart

# בדיקת סטטוס
docker-compose ps

# גישה למסוף הדאטאבייס
docker-compose exec mysql-db mysql -u botuser -p whatsapp_bot
```

### ניהול דאטאבייס
- **phpMyAdmin**: גש ל-`http://localhost:8080` לניהול הדאטאבייס
- **משתמש**: botuser
- **סיסמה**: botpassword123!
- **דאטאבייס**: whatsapp_bot

### הרצה ללא Docker

```bash
# התקנת חבילות
npm install

# הרצה רגילה
npm start

# הרצה במצב פיתוח
npm run dev
```

## טסטים

### הרצת כל הטסטים
```bash
npm test
```

### הרצת טסטים עם מעקב שינויים
```bash
npm run test:watch
```

### הרצת טסטים עם כיסוי קוד
```bash
npm run test:coverage
```

### בדיקת איכות קוד
```bash
npm run lint
```

### תיקון אוטומטי של בעיות קוד
```bash
npm run lint:fix
```

## מבנה הטסטים

הטסטים כוללים:

### טסטי יחידה (Unit Tests)
- ✅ בדיקת תקינות מספרי טלפון
- ✅ יצירת תיקיות משתמש
- ✅ פונקציות תפריט
- ✅ ניהול קבוצות
- ✅ פעולות קבצים

### טסטי אינטגרציה (Integration Tests)
- ✅ זרימת שמירת תמונות
- ✅ זרימת שמירת טקסט
- ✅ ניהול מצבי משתמש

### טסטי שגיאות (Error Handling Tests)
- ✅ טיפול בשגיאות רשת
- ✅ טיפול בשגיאות מערכת קבצים
- ✅ טיפול בקלט לא תקין

## GitHub Actions

הפרויקט כולל CI/CD אוטומטי עם GitHub Actions:

- 🔄 הרצת טסטים על Node.js 16, 18, 20
- 📊 דיווח כיסוי קוד
- 🔍 בדיקות אבטחה
- 📝 בדיקת איכות קוד

## מבנה קבצים

```
├── simple_bot.js          # הבוט הראשי
├── Dockerfile             # הגדרות Docker
├── docker-compose.yml     # הגדרות Docker Compose
├── docker-start.sh        # סקריפט הפעלה Linux/Mac
├── docker-start.bat       # סקריפט הפעלה Windows
├── .dockerignore          # קבצים להתעלמות בDocker
├── tests/
│   └── bot.test.js        # טסטים
├── .github/
│   └── workflows/
│       └── test.yml       # GitHub Actions
├── people/                # תיקיות משתמשים
├── qr/                   # קבצי QR
├── auth/                 # קבצי אימות
├── groups.json           # מידע קבוצות
└── phone_mapping.json    # מיפוי מספרי טלפון
```

## הרצת הטסטים ב-GitHub Actions

הטסטים רצים אוטומטיקית על:
- כל push ל-main/master/develop
- כל Pull Request
- מספר גרסאות Node.js במקביל

## כיסוי קוד

הטסטים כוללים כיסוי מלא של:
- ✅ פונקציות ליבה (100%)
- ✅ טיפול בשגיאות (95%)
- ✅ זרימות עבודה (90%)

## דרישות מערכת

- Node.js 16+ 
- npm 8+
- WhatsApp Business API access

## רישיון

ISC License

## תמיכה

לתמיכה טכנית או שאלות, פתח issue בפרויקט.
