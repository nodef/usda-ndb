'use strict';
const os = require('os');
const fs = require('fs');
const https = require('https');
const cp = require('child_process');
const cheerio = require('cheerio');
const httpStatus = require('http-status');
const chalk = require('chalk');
const arange = require('array-arange');


// I. global variables
const A = process.argv;
var output = null, retries = 4;
var connections = 4, timegap = 250;
var verbose = false;


// II. log functions
const logSill = (msg) => { if(verbose) console.log(chalk.gray(msg)); };
const logVerb = (msg) => { if(verbose) console.log(chalk.yellowBright(msg)); };
const logErr = (msg) => { if(verbose) console.log(chalk.redBright(msg)); };
const logTxt = (msg) => { if(verbose) console.log(msg); };


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
  logSill(`> GET https://${opt.hostname}${path}`);
  var req = https.request(opt, (res) => {
    var dat = '';
    res.setEncoding('utf8');
    logSill(`< ${res.statusCode} ${httpStatus[res.statusCode]}`);
    res.on('data', (chu) => dat += chu);
    res.on('end', () => {
      if(res.statusCode>=200 && res.statusCode<300) fres(dat);
      else frej(new Error(res.statusCode+' '+httpStatus[res.statusCode]));
    });
  });
  req.on('error', (e) => frej(e));
  req.end();
});


// III. main function
function usdaNdb(id) {
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


// IV. command-line
const fetch = (err, id) => usdaNdb(id).then((dat) => {
  logTxt(`${id}: ${dat['Number']}, ${dat['Name']}`);
  if(output!=null) output.write(JSON.stringify(dat)+os.EOL);
}, (e) => {
  logErr(`${id}: ${e.message}`);
  err.push(id);
});

const fetchall = (ids, tim) => new Promise((fres) => {
  var i = 0, I = ids.length, con = 0, pro = [], err = [];
  var tmr = setInterval(() => {
    if(i<I) return con<connections? pro[i] = (con++ && fetch(err, i++).then(() => con--)):null;
    Promise.all(pro).then(() => fres(err));
    clearInterval(tmr);
  }, tim);
});

const run = (ids) => new Promise((fres) => {
  function step(ids) {
    if(--retries<0 || ids.length===0) fres(ids);
    else fetchall(ids, timegap*=2).then(step);
  };
  timegap /=2;
  retries++;
  step(ids);
});

if(require.main===module) {
  // 1. process arguments
  var values = [];
  for(var i=0, I=A.length; i<I; i++) {
    if(A[i]==='-o' || A[i]==='--output') output = A[++i];
    else if(A[i]==='-c' || A[i]==='--connections') connections = parseInt(A[++i], 10);
    else if(A[i]==='-t' || A[i]==='--timegap') timegap = parseInt(A[++i], 10);
    else if(A[i]==='-r' || A[i]==='--retries') retries = parseInt(A[++i], 10);
    else if(A[i]==='-v' || A[i]==='--verbose') verbose = true;
    else if(A[i]==='--help') return cp.execSync(`less ${__dirname}/README.md`, {stdio: [0, 1, 2]});
    else values.push(A[i]);
  }
  var start = parseInt(values[0], 10)||0, stop = parseInt(values[1], 10)||start+1;
  logVerb(`Fetching ${start} -> ${stop}:`);
  logVerb(`- output file: ${output}`);
  logVerb(`- connections: ${connections}`);
  logVerb(`- timegap:     ${connections} ms`);
  logVerb(`- retries:     ${connections}`);
  run(arange(start, stop)).then((err) => {
    logVerb(`${start} -> ${stop} done, ${err.length} failed.`);
    console.error('FAILED:', err);
  });
}
