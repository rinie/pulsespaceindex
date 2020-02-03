set DEBUG=
set DEBUG_DEPTH=3
set DEBUG_HIDE_DATE=Yes
move samples\debug.csv samples\debug.cso
rem echo 'pulsespaceindex.js test' >samples/debug.csv
node pulsespaceindex.js ./samples/samples1.js >>samples/debug.csv
node pulsespaceindex.js ./samples/blsamples.js  >>samples/debug.csv
node index.js samples/rflinksamples.csv >>samples/debug.csv
node index.js samples/pilightsamples.txt >>samples/debug.csv
node index.js ./samples/pimaticsamples.js >>samples/debug.csv
node index.js samples/rflinkdata.csv >>samples/debug.csv
rem echo 'pulsespaceindex.js testend' >>samples/debug.csv
