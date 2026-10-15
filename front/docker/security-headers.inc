# Security headers for every response of the web client. Included in each location,
# because nginx does not inherit add_header into a location that sets its own headers.
# The policy placeholder below is replaced at image build time with docker/csp.txt, in
# which the API origin placeholder becomes the origin of VITE_API_BASE_URL (see the
# Dockerfile). The bearer token lives in Web Storage,
# so the CSP's strict script-src is the main defence against a script injection reading it.
add_header Content-Security-Policy "__CSP__" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
# TLS ends at the reverse proxy; browsers honour this header only over HTTPS.
add_header Strict-Transport-Security "max-age=31536000" always;
