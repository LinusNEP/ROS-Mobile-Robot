#!/usr/bin/env bash

set -euo pipefail
cd "$(dirname "$0")"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp -r src package.json vite.config.ts tsconfig*.json tailwind.config.js postcss.config.js components.json "$TMP"/
ln -s "$PWD/node_modules" "$TMP/node_modules"
cat > "$TMP/index.html" <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ROMR - ROS-based Open-source Mobile Robot</title>
    <meta name="description" content="ROMR: a low-cost, high-payload, ROS-compatible open-source mobile robot - design files, software and a MuJoCo digital twin." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
HTML
(cd "$TMP" && npx tsc -b && npx vite build --outDir "$TMP/dist" --emptyOutDir)
rm -rf assets
cp -r "$TMP/dist/assets" assets
cp "$TMP/dist/index.html" index.html
echo "Site rebuilt: docs/index.html + docs/assets/ updated."
