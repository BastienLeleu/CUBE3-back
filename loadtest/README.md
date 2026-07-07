# 🚀 Tests de charge & Benchmarking (Siege)

Ce dossier contient la configuration pour effectuer des tests de charge HTTP sur le backend NestJS à l'aide de l'outil **Siege**, exécuté au sein du réseau Docker.

---

## 📦 1. Comment ça marche ?

Le service `siege` est configuré dans `docker-compose.yml` avec l'image `alpine:3.19`. Au démarrage de l'infrastructure Docker, le conteneur `collector-siege` s'installe et reste en attente, prêt à envoyer des requêtes à haute vitesse directement sur le réseau interne Docker (`http://backend:3000/...`).

---

## ⚡ 2. Lancer un test de charge depuis Windows

### Option A : Via le script PowerShell (Recommandé)
Un script simplifié est à votre disposition dans ce dossier :

```powershell
# Test standard : 50 utilisateurs simultanés pendant 30 secondes
.\loadtest\run_loadtest.ps1 -Concurrent 50 -Time "30S"

# Test intensif (Mode Benchmark sans délai) : 100 utilisateurs pendant 1 minute
.\loadtest\run_loadtest.ps1 -Concurrent 100 -Time "1M" -Benchmark
```

### Option B : Directement via Docker CLI
Si vous préférez taper les commandes Docker manuellement :

```powershell
# Test sur la liste d'URLs (urls.txt)
docker exec -it collector-siege siege -c 50 -t 30S -f /loadtest/urls.txt

# Test ciblé sur l'endpoint des produits
docker exec -it collector-siege siege -c 50 -t 30S http://backend:3000/products
```

---

## 📊 3. Superviser le test en direct sur Grafana

1. Ouvrez votre navigateur sur le Dashboard Grafana : **[http://localhost:3001](http://localhost:3001)**
2. Lancez le test de charge dans votre terminal.
3. Observez en direct :
   - Le pic de requêtes HTTP / seconde.
   - Le temps de réponse (latence).
   - La consommation mémoire et CPU du Backend NestJS et de PostgreSQL.
