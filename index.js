'use strict';
const https = require('https');
const cheerio = require('cheerio');
const httpStatus = require('http-status');

function text(elm) {
  // 1. get text in element
  var chd = elm.children();
  return chd.length>0? chd.text():elm.text();
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
  var name = text($(tds[1])).trim();
  var unit = $(tds[2]).text().trim();
  var value = $(tds[vali]).text().trim();
  z[name] = `${value} ${unit}`;
};

const request = (path) => new Promise((fres, frej) => {
  // 1. make request to usda ndb
  var headers = {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'};
  var opt = {method: 'GET', hostname: 'ndb.nal.usda.gov', path, headers};
  var req = https.request(opt, (res) => {
    var dat = '';
    res.setEncoding('utf8');
    res.on('data', (chu) => dat += chu);
    res.on('end', () => {
      if(res.statusCode>=200 && res.statusCode<300) fres(dat);
      else frej(res.statusCode+' '+httpStatus[res.statusCode]);
    });
  });
  req.on('error', (e) => frej(e));
  req.end();
});

const usdaNdb = function(id) {
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
module.exports = usdaNdb;

if(require.main===module) {
  const z = {}, a = process.argv;
  const start = parseInt(a[2], 10)||0, stop = parseInt(a[3], 10)||start+1;
  const step = parseInt(a[4], 10)||1, inc = Math.sign(step);
  const fetch = (id) => pro.then(() => usdaNdb(id)).then((ans) => Object.assign(z, ans));
  for(var i=start, pro = Promise.resolve(); i!==stop;) {
    for(var I=Math.min(stop, i+step), p=[]; i!==I; i+=inc)
      p.push(fetch(i));
    pro = Promise.all(p);
  }
  pro.then(() => console.log(JSON.stringify(z)));
}
