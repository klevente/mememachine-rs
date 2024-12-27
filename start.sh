#!/bin/bash

mkdir -p "$SOUNDS_PATH"
ln -s "$SOUNDS_PATH" /app/dashboard/public/sounds

npm run --prefix /app/dashboard start &

/app/mememachine-rs &

wait -n

exit $?
