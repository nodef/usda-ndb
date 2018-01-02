# usda-ndb

[![NPM](https://nodei.co/npm/usda-ndb.png)](https://nodei.co/npm/usda-ndb/)

Get JSON Nutrient Data from [USDA Nutrient Database].

```bash
usda-ndb [flags] <start> <stop>
# <start>: start id (use 1 for first item in USDA NDB)
# <stop>: stop id (excluding) (note: Id <> NDB nutrient no.)
# [-o|--output]: write output to file (null)
# [-c|--connections]: maximum number of connections (4)
# [-t|--timegap]: request time gap in milliseconds (250)
# [-r|--retries]: times to retry failed requests (4)
# [-v|--verbose]: get detailed logs
# [--help]: show help

usda-ndb 1
# {"Id": "1", "Number": "01001", "Name": "Butter, salted", ...}
usda-ndb 1 100
# {"Id": "1", "Number": "01001", "Name": "Butter, salted", ...}
# {"Id": "2", "Number": "01002", "Name": "Butter, whipped, with salt", ...}
# ...
usda-ndb 0 2 --output nutrients.txt
# STDERR: 1 [ '0' ]
# (1 is the number of failures, even after retries)
# ([ '0' ] is the list of failed ids)
# (id 1 is written to file)
usda-ndb 1 100 -o somanyfoods.txt -c 20 -t 512 -r 10 -v
# (try this)
```
```javascript
var ndb = require('usda-ndb');
// ndb(<id>)

ndb(1).then((ans) => console.log(ans));
// {"Id": "1", "Number": "01001", "Name": "Butter, salted", ...}
```


[USDA Nutrient Database]: https://ndb.nal.usda.gov/ndb/
