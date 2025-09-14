# פתרון בעיות Docker

## שגיאה: Docker Desktop לא רץ

אם קיבלת שגיאה:
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json
```

### פתרונות:

#### 1. התקנת Docker Desktop
1. הורד Docker Desktop מ: https://docs.docker.com/desktop/windows/install/
2. התקן והפעל את Docker Desktop
3. חכה עד שהסטטוס יהיה "Docker Desktop is running"

#### 2. בדיקת Docker
```cmd
docker --version
docker-compose --version
```

#### 3. הפעלת Docker Desktop
- פתח Docker Desktop מה-Start Menu
- חכה עד שהאייקון יהיה ירוק
- נסה שוב להריץ: `docker-compose up`

### הרצה ללא Docker (חלופה)

אם Docker לא עובד, תוכל להריץ עם MySQL מקומי:

#### 1. התקנת MySQL
1. הורד MySQL Community Server: https://dev.mysql.com/downloads/mysql/
2. התקן עם הגדרות ברירת מחדל
3. זכור את הסיסמה של root

#### 2. הגדרת דאטאבייס
```sql
-- התחבר ל-MySQL כ-root
mysql -u root -p

-- צור דאטאבייס ומשתמש
CREATE DATABASE whatsapp_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'botuser'@'localhost' IDENTIFIED BY 'botpassword123!';
GRANT ALL PRIVILEGES ON whatsapp_bot.* TO 'botuser'@'localhost';
FLUSH PRIVILEGES;

-- השתמש בדאטאבייס
USE whatsapp_bot;

-- הרץ את הסקריפט מ-database/init.sql
SOURCE C:/Users/bm329/Desktop/Newfolder (4)/database/init.sql;
```

#### 3. עדכון הגדרות
צור קובץ `.env` בתיקיית הפרויקט:
```
DB_HOST=localhost
DB_USER=botuser
DB_PASSWORD=botpassword123!
DB_NAME=whatsapp_bot
NODE_ENV=production
```

#### 4. הרצת הבוט
```bash
npm install
npm start
```

### בדיקת החיבור
```bash
# בדיקה שהדאטאבייס עובד
mysql -u botuser -p whatsapp_bot

# בתוך MySQL
SHOW TABLES;
SELECT * FROM bot_settings;
```

### פתרון בעיות נוספות

#### שגיאת חיבור לדאטאבייס
```
Error: connect ECONNREFUSED 127.0.0.1:3306
Error: connect ECONNREFUSED 127.0.0.1:3007
```
**פתרון**: ודא ש-MySQL Service רץ:
- Windows: Services → MySQL80 → Start
- או: `net start mysql80`
- אם השתמשת בפורט 3007: ודא שהפורט פנוי

#### שגיאת אימות
```
Error: Access denied for user 'botuser'@'localhost'
```
**פתרון**: בדוק שהמשתמש נוצר נכון:
```sql
SELECT user, host FROM mysql.user WHERE user = 'botuser';
```

#### יציאה 3306 או 3007 תפוסה
**פתרון**: 
- בדוק איזה שירותים משתמשים בפורט: `netstat -an | findstr :3306` או `netstat -an | findstr :3007`
- שנה פורט בקובץ my.ini או עצור שירותים אחרים
- בפרויקט זה MySQL פועל על פורט 3007 כדי למנוע התנגשויות
