#!/usr/bin/env bash

# get state map file from TIGER. A 20m resolution will be fine
wget http://www2.census.gov/geo/tiger/GENZ2016/shp/cb_2016_us_state_20m.zip && unzip cb_2016_us_state_20m.zip -d shp

# filter out the territories, AK and HI and then rename a few of the fields
mapshaper shp/cb_2016_us_state_20m.shp name=states -filter 'parseInt(STATEFP) <= 56 && STATEFP != "02" && STATEFP != "15"' -filter-fields STATEFP,STUSPS,NAME -rename-fields FIPS=STATEFP,ABBR=STUSPS -o maps/states.shp

# cleanup	
rm shp/* && rm *.zip



# The Umbra

# get the umbra shapefiles from NASA. We want 'upath17.shp' of the various file included
wget https://svs.gsfc.nasa.gov/vis/a000000/a004500/a004518/eclipse2017_shapefiles.zip && unzip eclipse2017_shapefiles.zip -d shp

# Clip the umbra to the land boundaries
mapshaper shp/upath17.shp name=umbra_land -clip maps/states.shp -o maps/umbra_land.shp

# GeoJSON of clipped umbra
mapshaper maps/umbra_land.shp name=umbra_land -o format=geojson data/umbra_land.geo.json

# cleanup
rm shp/* && rm *.zip




# Federal Lands

wget https://prd-tnm.s3.amazonaws.com/StagedProducts/Small-scale/data/Boundaries/fedlanp010g.shp_nt00966.tar.gz && tar xvzf fedlanp010g.shp_nt00966.tar.gz -C shp 

# filter down only to "Public Domain Land"
mapshaper shp/fedlanp010g.shp encoding=utf8 name=public_land -filter 'FEATURE1 == "Public Domain Land"' -filter-fields OBJECTID,STATE_FIPS,AREA,ADMIN1,FEATURE1,FEATURE2,GIS_ACRES,GNIS_ID1,GNIS_Name1,URL -rename-fields ID=OBJECTID,STFIPS=STATE_FIPS,AGENCY=ADMIN1,TYPE=FEATURE1,SUBTYPE=FEATURE2,ACRES=GIS_ACRES,GNIS_ID=GNIS_ID1,NAME=GNIS_Name1,URL=URL -o shp/public_land.shp	

# save as GeoJSON to test TurfJS later
mapshaper shp/public_land.shp encoding=utf8 -o format=geojson data/all_public_land.geo.json

# clip to umbra
mapshaper shp/public_land.shp encoding=utf8 name=umbra_public_land -clip maps/umbra_land.shp -o maps/umbra_public_land.shp
mapshaper maps/umbra_public_land.shp encoding=utf8 -o format=geojson data/umbra_public_land.geo.json

# cleanup
rm shp/* && rm *.tar.gz



# Roads

# This will take about a minute
wget https://www.fhwa.dot.gov/planning/processes/tools/nhpn/2015/nhpnv14-05shp.zip && unzip nhpnv14-05shp.zip -d shp

# Filter to publicly accessible roads
node --max_old_space_size=4096 $(which mapshaper) shp/NHPNLine.shp encoding=utf8 name=roads -filter 'STATUS == "1" && SIGNQ1 != "F" && SIGNQ2 != "F" && SIGNQ3 != "F" ' -filter-fields STFIPS,CTFIPS,ROUTE_ID,BEGIN_POIN,END_POINT,F_SYSTEM,FACILITY_T,MILES,KM -rename-fields ID=ROUTE_ID,BEGIN_PT=BEGIN_POIN,END_PT=END_POINT,TYPE=F_SYSTEM,DIRECTION=FACILITY_T -o shp/roads.shp	

# Mapshaper says "Retained 624,513 of 626,366 features." Now let's filter down to the umbra states (see [umbra_states_fips.json](umbra_states_fips.json))
node --max_old_space_size=4096 $(which mapshaper) shp/roads.shp encoding=utf8 -filter '[ 41, 16, 30, 56, 31, 20, 19, 29, 17, 21, 47, 37, 45, 13 ].indexOf(parseInt(STFIPS, 10)) != -1' -o shp/umbra_state_roads.shp

# clip to umbra. 
# Thanks the Matthew Block for fixing a (bug)[https://github.com/mbloch/mapshaper/issues/192#issuecomment-313146371] here
node --max_old_space_size=4096 $(which mapshaper) shp/umbra_state_roads.shp encoding=utf8 name=umbra_roads -clip maps/umbra_land.shp -o shp/umbra_roads.shp

# remove roads that run over public land so that we don't double-count
mapshaper shp/umbra_roads.shp -erase maps/umbra_public_land.shp -o maps/umbra_roads.shp
mapshaper maps/umbra_roads.shp -o format=geojson data/umbra_roads.geo.json
rm shp/* && rm *.zip

./analyze_umbra.js