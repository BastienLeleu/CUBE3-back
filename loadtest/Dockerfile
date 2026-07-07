FROM debian:bookworm-slim

# Installation de Siege et création d'un utilisateur non-root dédié (sécurité Checkov)
RUN apt-get update && apt-get install -y --no-install-recommends siege=4.1.6-1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r loadtest && useradd -r -g loadtest -m -d /home/loadtest -s /bin/sh loadtest \
    && mkdir -p /loadtest && chown -R loadtest:loadtest /loadtest /home/loadtest

WORKDIR /loadtest

# Passer à l'utilisateur non-root pour satisfaire CKV_DOCKER_3
USER loadtest

# Vérification de santé (Healthcheck) pour satisfaire CKV_DOCKER_2
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD siege --version || exit 1

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["echo '==========================================================\n 🚀 Conteneur Siege prêt pour les tests de charge CUBE3 !\n==========================================================\n' && tail -f /dev/null"]
