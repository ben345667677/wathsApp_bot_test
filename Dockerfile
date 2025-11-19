# שימוש ב-Node.js 18 כבסיס
FROM node:18-slim

# התקנת תלויות נדרשות עבור Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    libxtst6 \
    libnss3 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# הגדרת משתנה סביבה ל-Puppeteer להשתמש ב-Chromium המותקן
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# יצירת תיקיית עבודה
WORKDIR /app

# העתקת package.json ו-package-lock.json
COPY package*.json ./

# התקנת תלויות
RUN npm ci --only=production

# העתקת כל הקבצים
COPY . .

# חשיפת פורט 5556 עבור שרת QR
EXPOSE 5556

# יצירת תיקייה לנתוני אימות
RUN mkdir -p .wwebjs_auth .wwebjs_cache && \
    chown -R node:node /app && \
    chmod -R 755 /app

# לא מחליף משתמש - נשאר כ-root כדי למנוע בעיות הרשאות
# USER node

# יצירת entrypoint ספציפי כדי לעקוף בעיות הרשאות
RUN echo '#!/bin/sh\nexec node "$@"' > /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# הרצת הבוט
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "bot.js"]
