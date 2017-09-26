'use strict';
const https = require('https');
const jsdom = require('jsdom');
const _assign = require('lodash.assign');

const text = function(el) {
  if(!el.children.length) return el.textContent;
  return el.firstChild.textContent;
};

const request = function(path) {
  return jsdom.JSDOM.fromURL(`https://ndb.nal.usda.gov${path}`, {
    'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  });
};

const ndb = function(id) {
  return request(`/ndb/foods/show/${id}?format=Full`).then((dom) => {
    const a = {}, b = {}, document = dom.window.document;
    const viewName = document.getElementById('view-name');
    if(viewName==null) return {};
    const key = viewName.textContent.trim().match(/\d+,.*/g)[0];
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
    a[key] = b;
    return a;
  });
};

const $ = function(start, stop, step) {
  var start = start||0, stop = step||start+1, step = step||1;
  const a = {}, inc = Math.sign(step);
  const fetch = (id) => pro.then(() => ndb(id)).then((ans) => _assign(a, ans));
  for(var i=start, pro = Promise.resolve(); i!==stop;) {
    for(var I=Math.min(stop, i+step), p=[]; i!==I; i+=inc)
      p.push(fetch(i));
    pro = Promise.all(p);
  }
  return pro.then(() => a);
};
module.exports = $;

if(require.main===module) {
  const a = process.argv;
  $(parseInt(a[2]), parseInt(a[3]), parseInt(a[4])).then((ans) =>
    console.log(JSON.stringify(ans))
  );
}
