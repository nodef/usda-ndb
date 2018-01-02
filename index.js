'use strict';
const os = require('os');
const fs = require('fs');
const https = require('https');
const cp = require('child_process');
const cheerio = require('cheerio');
const httpStatus = require('http-status');
const chalk = require('chalk');


// I. global variables
const A = process.argv;
var output = null, retries = 4;
var connections = 4, timegap = 250;
var verbose = false;


// II. log functions
const logSill = (msg) => { if(verbose) console.log(chalk.gray(msg)); };
const logVerb = (msg) => { if(verbose) console.log(chalk.yellowBright(msg)); };
const logErr = (msg) => { if(verbose) console.log(chalk.redBright(msg)); };


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

const request = (path) => new Promise((fres, frej) => {
  // 1. make request to usda ndb
  var headers = {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'};
  var opt = {method: 'GET', hostname: 'ndb.nal.usda.gov', path, headers};
  logSill(`> GET https://${opt.hostname}${path}`);
  var req = https.request(opt, (res) => {
    res.setEncoding('utf8');
    var dat = '', code = res.statusCode, status = httpStatus[code];
    logSill(`< https://${opt.hostname}${path} : ${code} ${status}`);
    res.on('data', (chu) => dat += chu);
    res.on('end', () => {
      if(code>=200 && code<300) fres(dat);
      else frej(new Error(code+' '+status));
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
  logVerb(`${id}: ${dat['Number']}, ${dat['Name']} - ${Object.keys(dat).length} properties`);
  if(output==null) console.log(JSON.stringify(dat));
  else output.write(JSON.stringify(dat)+os.EOL);
}, (e) => {
  logErr(`${id}: ${e.message}`);
  err.push(id);
});

const fetchall = (ids, tim) => new Promise((fres) => {
  var i = 0, I = ids.length, con = 0, pro = [], err = [];
  var tmr = setInterval(() => {
    if(i<I) return con<connections? pro[i] = (con++ && fetch(err, ids[i++]).then(() => con--)):null;
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
  var values = [], job = [];
  for(var i=2, I=A.length; i<I; i++) {
    if(A[i]==='-o' || A[i]==='--output') output = fs.createWriteStream(A[++i]);
    else if(A[i]==='-c' || A[i]==='--connections') connections = parseInt(A[++i], 10);
    else if(A[i]==='-t' || A[i]==='--timegap') timegap = parseInt(A[++i], 10);
    else if(A[i]==='-r' || A[i]==='--retries') retries = parseInt(A[++i], 10);
    else if(A[i]==='-v' || A[i]==='--verbose') verbose = true;
    else if(A[i]==='--help') return cp.execSync(`less ${__dirname}/README.md`, {stdio: [0, 1, 2]});
    else values.push(A[i]);
  }
  // 2. run job
  var start = parseInt(values[0], 10)||0, stop = parseInt(values[1], 10)||start+1;
  logVerb(`Fetching ${start} -> ${stop}:`);
  logVerb(`- output file: ${output}`);
  logVerb(`- connections: ${connections}`);
  logVerb(`- timegap:     ${timegap} ms`);
  logVerb(`- retries:     ${retries}`);
  for(var i=start; i<stop; i++)
    job[i-start] = i.toString();
  run(job).then((err) => {
    logVerb(`${start} -> ${stop} done; ${job.length-err.length} passed, ${err.length} failed.`);
    if(err.length>0) console.error(err.length, err);
    if(output!=null) output.end();
  });
}
