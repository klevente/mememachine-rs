#!/bin/sh

ARCHIVE_NAME="mememachine-rs-aarch64-unknown-linux-gnu.tar.gz"

wget https://github.com/klevente/mememachine-rs/releases/latest/download/$ARCHIVE_NAME

pkill mememachine-rs

tar -zxvf $ARCHIVE_NAME

rm $ARCHIVE_NAME

./start_mememachine.sh &
