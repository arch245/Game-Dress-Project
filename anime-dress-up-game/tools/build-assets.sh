#!/bin/sh
# Rebuild every sprite from raw/*.png  (needs: npm i sharp  somewhere on NODE_PATH)
set -e
node tools/process.cjs > /dev/null   # doll + the first 48 pieces + first backgrounds
node tools/fit.cjs none              # head / neck / hand overlays
node tools/ext.cjs "$@"              # swimsuits, gowns and the 60 derived pieces
node tools/bg.cjs                    # three extra destinations
node tools/pack.cjs                  # -> src/game/sprites.json
