FROM lobehub/lobehub:2.2.21

# Railway launcher (runs as root, then drops to the image's nextjs user):
# waits for Postgres, persists a generated JWKS_KEY on the volume, sets CORS on
# the Railway bucket so browser uploads work, then starts the stock server.
USER root
COPY railway-launcher.cjs /railway-launcher.cjs
ENTRYPOINT ["/bin/node", "/railway-launcher.cjs"]
