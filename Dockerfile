FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# Mettre à jour et installer Chromium + les dépendances graphiques et polices nécessaires
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Utiliser 'npm install' au lieu de 'npm ci' pour éviter les conflits de version de lockfile sur Railway
RUN npm install

# Copier le reste du code de ton bot
COPY . .

# CRUCIAL : Définir la variable d'environnement pour que index.js sache où est Chrome
ENV CHROMIUM_PATH=/usr/bin/chromium

CMD ["node", "index.js"]