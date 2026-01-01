#!/data/data/com.termux/files/usr/bin/bash
cd ~/sercuctech/hub
pkill -f http.server
python3 -m http.server 8092 --bind 127.0.0.1
