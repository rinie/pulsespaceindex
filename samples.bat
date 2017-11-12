set DEBUG=*
set DEBUG_DEPTH=3
set DEBUG_HIDE_DATE=Yes
move samples\debug.txt samples\debug.old
echo 'pulsespaceindex.js test' >samples/debug.txt
node pulsespaceindex.js ./samples/samples1.js 2>samples/debug.txt
node pulsespaceindex.js ./samples/blsamples.js  2>>samples/debug.txt
node index.js samples/rflinksamples.csv 2>>samples/debug.txt
node index.js samples/pilightsamples.txt 2>>samples/debug.txt
echo 'pulsespaceindex.js testend' >>samples/debug.txt
