# usda-ndb

Get JSON Nutrient Data from ndb.nal.usda.gov.

```bash
# using as command line application
node index <start> <stop> <step>

# get nutrient info of food id 1
node index 1

# get nutrient info of food id 1 to 100 (excluding)
node index 1 100

# get nutrient info of food id 1 to 100, 20 parallel connections
node index 1 100 20
```
