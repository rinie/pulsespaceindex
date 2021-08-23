set DEBUG=*
set DEBUG_DEPTH=3
set DEBUG_HIDE_DATE=Yes
move samples\debugkaku20210823.csv samples\debugkaku20210823.cso
rem echo 'pulsespaceindex.js kaku20210823' >samples/debugkaku20210823.csv
node index.js samples/rflinkkaku20210823.csv >>samples/debugkaku20210823.csv
node pulsespaceindex.js ./samples/blkaku20210823.js  >>samples/debugkaku20210823.csv
node index.js samples/portischkaku20210823.txt >>samples/debugkaku20210823.csv
rem echo 'pulsespaceindex.js kaku20210823' >>samples/debugkaku20210823.csv
