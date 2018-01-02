# usda-ndb

[![NPM](https://nodei.co/npm/usda-ndb.png)](https://nodei.co/npm/usda-ndb/)

Get JSON Nutrient Data from [USDA Nutrient Database].

```bash
usda-ndb [flags] <start> <stop> <step>
# [-o|--output <file>]: write output to file
# [-v|--verbose]: get detailed logs

# get nutrient info of food id 1
usda-ndb 1
# get nutrient info of food id 1 to 100 (excluding)
usda-ndb 1 100
# get nutrient info of food id 1 to 100, 20 parallel connections
usda-ndb 1 100 20
```
```javascript
// using as a javascript module
var ndb = require('usda-ndb');
// ndb(<id>)

ndb(1).then((ans) => console.log(ans));
// {"1":{"Name":"01001, Butter, salted", ... }
```


[USDA Nutrient Database]: https://ndb.nal.usda.gov/ndb/
