'use strict';
const https = require('https');
const jsdom = require('jsdom');

const text = function(el) {
  // 1. get text in element
  if(!el.children.length) return el.textContent;
  return el.firstChild.textContent;
};

const request = (path) => new Promise((fres, frej) => {
  var headers = {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'};
  var opt = {method: 'GET', hostname: 'ndb.nal.usda.gov', path, headers};
  var req = https.request(opt, (res) => {
    var dat = '';
    res.setEncoding('utf8');
    res.on('data', (chu) => dat += chu);
    res.on('end', () => res.statusCode/100===2? fres(dat):frej(dat));
  });
  req.on('error', (e) => frej(e));
  req.end();
});

const $ = function(id) {
  return request(`/ndb/foods/show/${id}?format=Full`).then((dom) => {
    const a = {}, b = {}, document = dom.window.document;
    const viewName = document.getElementById('view-name');
    if(viewName==null) return {};
    b['Name'] = viewName.textContent.trim().match(/\d+,.*/g)[0];
    const props = document.querySelectorAll('.prop');
    for(var prop of props) {
      var names = prop.querySelectorAll('.name');
      var values = prop.querySelectorAll('.value');
      for(var i=0, I=names.length; i<I; i++)
        b[names[i].textContent.trim().replace(/:/g, '')] = values[i].textContent.trim();
    }
    const valuei = props[0].children[0].textContent==='Manufacturer'? 4 : 3;
    for(var tr of document.querySelectorAll('#nutdata tbody tr')) {
      var tds = tr.getElementsByTagName('td');
      var name = text(tds[1]).trim();
      var unit = tds[2].textContent.trim();
      var value = tds[valuei].textContent.trim();
      b[name] = `${value} ${unit}`;
    }
    a[id] = b;
    return a;
  }, (err) => {
    const dom = new jsdom.JSDOM(err.error.toString());
    throw new Error(''+err.statusCode+' - '+dom.window.document.title);
  });
};
module.exports = $;

if(require.main===module) {
  const z = {}, a = process.argv;
  const start = parseInt(a[2], 10)||0, stop = parseInt(a[3], 10)||start+1;
  const step = parseInt(a[4], 10)||1, inc = Math.sign(step);
  const fetch = (id) => pro.then(() => $(id)).then((ans) => Object.assign(z, ans));
  for(var i=start, pro = Promise.resolve(); i!==stop;) {
    for(var I=Math.min(stop, i+step), p=[]; i!==I; i+=inc)
      p.push(fetch(i));
    pro = Promise.all(p);
  }
  pro.then(() => console.log(JSON.stringify(z)));
}
