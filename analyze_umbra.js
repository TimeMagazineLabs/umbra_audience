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

// TOTAL POPULATION AS OF JULY 10, 2017
// https://www.census.gov/popclock/
var POPULATION = 325517460;

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
	var distance = turf.lineDistance(line, 'miles');
	umbra.roads += distance;
});

console.log("Total miles of roads in umbra:", commafy(Math.round(umbra.roads)));


// Let's fit the population in the umbra. We'll start with putting everyone on public land
var sq_ft_per_sq_mile = 5280 * 5280;

// And let's allow for 150ft x 150ft for PortaJohns
sq_ft_per_sq_mile -= 150 * 150;

var umbra_sq_ft = umbra.public_land * sq_ft_per_sq_mile;

umbra.sq_feet_per_person = umbra_sq_ft / POPULATION;
console.log("Square feet per person:", umbra.sq_feet_per_person);

umbra.people_per_sq_mile = 5280 * 5280 / umbra.sq_feet_per_person;

console.log("People per square mile:", umbra.people_per_sq_mile);

// now let's imagine that some people take to the roads

var people = 0;

// assumptions
// 20 ft per car. Times two because people can stand on either side of the road
const CARS_PER_MILE = 2 * 5280 / 20;
const PEOPLE_PER_CAR = 4;

people += umbra.roads * CARS_PER_MILE * PEOPLE_PER_CAR;

umbra.people_on_roads = Math.floor(people);

console.log("People who can fit on roads:", commafy(Math.floor(people)));

umbra.sq_feet_per_person_minus_roads = umbra_sq_ft / (POPULATION - umbra.people_on_roads);
console.log("Square feet per person, not including those on the roads:", umbra.sq_feet_per_person_minus_roads);



fs.writeFileSync("umbra_audience.json", JSON.stringify(umbra, null, 2));
