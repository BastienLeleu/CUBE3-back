FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends siege && rm -rf /var/lib/apt/lists/*
WORKDIR /loadtest
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["echo '==========================================================\n 🚀 Conteneur Siege prêt pour les tests de charge CUBE3 !\n==========================================================\n' && tail -f /dev/null"]
