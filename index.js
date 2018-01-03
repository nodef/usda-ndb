'use strict';
const cheerio = require('cheerio');
const scrapeArange = require('terminal-scrapearange');


function text(elm, $) {
  // 1. get text in element
  if(!elm.childNodes.length) return $(elm).text();
  return $(elm.firstChild).text();
};

function nameParts(z, str, id) {
  // 1. get details from name
  var ni = str.search(/^\d+/);
  var si = ni===0? str.indexOf(',')+2:0;
  var ui = str.search(/UPC: \d+$/);
  z['Number'] = si>0? str.substring(0, si-2):id;
  z['Name'] = str.substring(si, ui>0? ui-2:str.length);
  if(ui>0) z['UPC'] = str.substring(ui+5);
  return z;
};

function headerParts(z, $, elm) {
  // 1. get details from header
  var names = elm.find('.name');
  var values = elm.find('.value');
  for(var i=0, I=names.length; i<I; i++)
    z[$(names[i]).text().trim().replace(/:/g, '')] = $(values[i]).text().trim();
};

function bodyParts(z, $, elm, vali) {
  // 1. get details from body
  var tds = $(elm).find('td');
  var name = text(tds[1], $).trim();
  var unit = $(tds[2]).text().trim();
  var value = $(tds[vali]).text().trim();
  z[name] = `${value} ${unit}`;
};

function request(path) {
  // 1. make request to usda ndb
  var opt = {method: 'GET', hostname: 'ndb.nal.usda.gov', path};
  return scrapeArange.request(opt);
};


// III. main function
function ndb(id) {
  return request(`/ndb/foods/show/${id}?format=Full`).then((html) => {
    var $ = cheerio.load(html), z = {'Id': id};
    var viewName = $('#view-name');
    if(viewName==null) return {};
    nameParts(z, viewName.text().trim().match(/\d+,.*/g)[0], id);
    $('.prop').each((i, elm) => headerParts(z, $, $(elm)));
    var vali = z.hasOwnProperty('Manufacturer')? 4:3;
    $('#nutdata tbody tr').each((i, elm) => bodyParts(z, $, $(elm), vali));
    return z;
  });
};
module.exports = ndb;


// IV. command-line
if(require.main===module) scrapeArange.main({method: ndb});
