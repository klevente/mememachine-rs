#!/bin/bash

ln -s "$SOUNDS_PATH" /app/dashboard/public/sounds

/app/mememachine-rs &

npm run --prefix /app/dashboard start

wait -n

exit $?