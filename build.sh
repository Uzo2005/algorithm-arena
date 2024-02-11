#bin/sh

set -xe


nimble install

nim r createDb.nim
nim c -d:release server.nim

./server