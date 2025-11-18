# 🐳 הוראות הרצה עם Docker

## הרצה מהירה

### 1. בניית ההרצת הבוט
```bash
docker-compose up -d
```

### 2. צפייה בלוגים (כולל QR Code)
```bash
docker-compose logs -f whatsapp-bot
```

### 3. גישה לשרת QR
פתח בדפדפן: http://localhost:5556

הדפדפן אמור להיפתח אוטומטית כשיש צורך בסריקת QR!

---

## פקודות שימושיות

### עצירת הבוט
```bash
docker-compose down
```

### הפעלה מחדש
```bash
docker-compose restart
```

### צפייה בלוגים בזמן אמת
```bash
docker-compose logs -f
```

### מחיקת נתוני אימות (אתחול מלא)
```bash
docker-compose down
rm -rf bot-data bot-cache
docker-compose up -d
```

### בניה מחדש (אחרי שינויים בקוד)
```bash
docker-compose up -d --build
```

---

## איך זה עובד?

1. **פורט 5556** - חשוף החוצה כדי שתוכל לגשת לשרת ה-QR מהדפדפן
2. **נתוני אימות** - נשמרים בתיקייה `bot-data` בחוץ מהקונטיינר, אז לא תצטרך לסרוק QR כל פעם
3. **מטמון** - נשמר בתיקייה `bot-cache`
4. **לוגים** - מוגבלים ל-10MB לקובץ, מקסימום 3 קבצים

---

## פתרון בעיות

### הבוט לא פועל?
```bash
docker-compose logs whatsapp-bot
```

### נתקעת בסריקת QR?
1. עצור את הבוט: `docker-compose down`
2. מחק נתונים: `rm -rf bot-data bot-cache`
3. הפעל מחדש: `docker-compose up -d`
4. פתח http://localhost:5556 בדפדפן

### שגיאת הרשאות?
```bash
sudo chown -R 1000:1000 bot-data bot-cache
```

---

## בניה ללא docker-compose

### בניית Image
```bash
docker build -t quizsense-bot .
```

### הרצה
```bash
docker run -d \
  --name quizsense-bot \
  -p 5556:5556 \
  -v $(pwd)/bot-data:/app/.wwebjs_auth \
  -v $(pwd)/bot-cache:/app/.wwebjs_cache \
  --shm-size=2gb \
  quizsense-bot
```

### צפייה בלוגים
```bash
docker logs -f quizsense-bot
```

---

## אבטחה

הקונטיינר מוגדר עם:
- ✅ משתמש לא-root (`node`)
- ✅ הרשאות מינימליות
- ✅ `no-new-privileges`
- ✅ הגבלת גודל לוגים

---

## יציאה לייצור (Production)

לשימוש בסביבת ייצור, מומלץ:

1. להוסיף reverse proxy (nginx/traefik)
2. להוסיף SSL/TLS
3. להגביל גישה לפורט 5556
4. להשתמש ב-secrets עבור credentials
5. להגדיר monitoring

דוגמה עם nginx:
```nginx
server {
    listen 80;
    server_name bot.quizsense.com;

    location / {
        proxy_pass http://localhost:5556;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
