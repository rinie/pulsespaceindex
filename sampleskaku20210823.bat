set DEBUG=*
set DEBUG_DEPTH=3
set DEBUG_HIDE_DATE=Yes
move samples\debugkaku20210823.txt samples\debugkaku20210823.old
rem echo 'pulsespaceindex.js kaku20210823' 2>samples/debugkaku20210823.txt
node index.js samples/rflinkkaku20210823.csv 2>>samples/debugkaku20210823.txt
node pulsespaceindex.js ./samples/blkaku20210823.js  2>>samples/debugkaku20210823.txt
node index.js samples/portischkaku20210823.txt 2>>samples/debugkaku20210823.txt
rem echo 'pulsespaceindex.js kaku20210823' 2>>samples/debugkaku20210823.txt
