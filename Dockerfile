# Étape 1 : Build
FROM node:22 AS builder
WORKDIR /app

# Copie des fichiers de configuration des dépendances
COPY package*.json ./

# Installation propre de toutes les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copie du reste du code source
COPY . .

# Compilation de l'application NestJS (génère le dossier dist/)
RUN npm run build

# Étape 2 : Production
FROM node:22-alpine AS production
WORKDIR /app

# Configuration de l'environnement en production
ENV NODE_ENV=production

# Copie uniquement des fichiers nécessaires pour installer les dépendances de prod
COPY package*.json ./

# Installation uniquement des dépendances de production pour une image légère
RUN npm ci --omit=dev

# Copie du build généré à l'étape précédente
COPY --from=builder /app/dist ./dist

# Utilisation de l'utilisateur non-root 'node' fourni par l'image Alpine
USER node

# Exposition du port par défaut de NestJS
EXPOSE 3000

# Démarrage de l'application
CMD ["node", "dist/main.js"]
