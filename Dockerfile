FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# Installer les dépendances système manquantes pour whatsapp-web.js
RUN apt-get update && apt-get install -y \
    gconf-service \
    libgpgme11 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["node", "index.js"]