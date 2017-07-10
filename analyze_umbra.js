#!/usr/bin/env node

var fs = require('fs');
var turf = require('turf');
var commafy = require('commafy');

var roads = require("./data/umbra_roads.geo.json");
var public_land = require("./data/umbra_public_land.geo.json");
var all_public_land = require("./data/all_public_land.geo.json");
var umbra_land = require("./data/umbra_land.geo.json");

// calculations
var umbra = {};

// constants
// http://www.metric-conversions.org/area/square-miles-to-square-meters.htm
const SQ_METERS_PER_SQUARE_MILE = 2589988;

// TEST TURFJS AGAINST ALL PUBLIC LAND
// average is 1.0003210219984386 -- good!
/*
var total = 0;
all_public_land.features.forEach(line => {
	var m = +line.properties.AREA;
	var d = turf.area(line) / SQ_METERS_PER_SQUARE_MILE;
	total += d / m;
});
var mean = total / all_public_land.features.length;
console.log("TurfJS area compared to AREA:", mean);
*/

// TOTAL AREA OF UMBRA
var sq_meters = turf.area(umbra_land);
var sq_miles = sq_meters / SQ_METERS_PER_SQUARE_MILE;

console.log("Total area of umbra over landmass", commafy(Math.round(sq_miles)), "square miles.");

umbra.total_area = sq_miles;


// PUBLIC LAND IN UMBRA
umbra.public_land = 0;
public_land.features.forEach(line => {
	umbra.public_land += turf.area(line) / SQ_METERS_PER_SQUARE_MILE;
});

console.log("Total public area in umbra:", commafy(Math.round(umbra.public_land)), "square miles.");

// ROADS
umbra.roads = 0;
roads.features.forEach(line => {
	umbra.roads += turf.lineDistance(line, 'miles');
});

console.log("Total miles of roads in umbra:", commafy(Math.round(umbra.roads)));

// assumptions
const FEET_PER_PERSON = 6;
const SQ_FEET_PER_PERSON = FEET_PER_PERSON * FEET_PER_PERSON;

// times two because people can stand on either side of the road
const PEOPLE_PER_MILE = 5280 * 2 / FEET_PER_PERSON; 
const AREA_FOR_PORTAJOHNS = 100 * 100;
const PEOPLE_PER_SQ_MILE = (5280 * 5280 - AREA_FOR_PORTAJOHNS) / SQ_FEET_PER_PERSON;

console.log("People per mile", PEOPLE_PER_MILE);

console.log("People per square mile", PEOPLE_PER_SQ_MILE);

umbra.people_land = umbra.public_land * PEOPLE_PER_SQ_MILE;
console.log("People who can fit in public land:", commafy(Math.round(umbra.people_land)));

umbra.people_roads = umbra.roads * PEOPLE_PER_MILE;
console.log("People who can fit along roads:", commafy(Math.round(umbra.people_roads)));

umbra.total_audience = umbra.people_land + umbra.people_roads;
console.log("TOTAL AUDIENCE:", commafy(Math.round(umbra.total_audience)));

fs.writeFileSync("umbra_audience.json", JSON.stringify(umbra, null, 2));
