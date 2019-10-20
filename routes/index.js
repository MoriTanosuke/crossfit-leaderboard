const express = require('express');
const request = require('request');
const router = express.Router();

const urls = [
  'https://games.crossfit.com/competitions/api/v1/competitions/open/2020/leaderboards?view=0&division=1&hashtag=880&hashtag_display=teamrichey&scaled=0&sort=0&page=1',
  'https://games.crossfit.com/competitions/api/v1/competitions/open/2020/leaderboards?view=0&division=2&hashtag=880&hashtag_display=teamrichey&scaled=0&sort=0&page=1'
];
const model = {
  progress: 0,
  currentPage: 0,
  totalPages: 99999,
  last_updated: undefined,
  competitors: [],
  countryCodes: new Set(),
  ageBrackets: new Set(),
  gender: {
    'F': 0,
    'M': 0
  },
  busy: true
};

function loadFromUrls(urls, done) {
  if(urls.length > 0) {
    const url = urls.pop();
    loadFromUrl(url, () => loadFromUrls(urls, done));
  } else {
    model.last_updated = new Date();
    model.busy = false;
    done();
  }
}

function extractStatistics(rows) {
  for (i in rows) {
    let row = rows[i].entrant;

    // country
    let countryCode = row.countryOfOriginCode;
    if (!model.countryCodes[countryCode]) model.countryCodes[countryCode] = 0;
    model.countryCodes[countryCode] += 1;

    // age
    let age = row.age;
    if (!model.ageBrackets[age]) model.ageBrackets[age] = 0;
    model.ageBrackets[age] += 1;

    // gender
    let gender = row.gender;
    model.gender[gender] += 1;
  }
}

function loadFromUrl(url, done) {
  console.log('Loading URL', url);
  request({uri: url, json: true}, function (err, resp, body) {
    if (err) {
      console.log(err);
    }

    model.currentPage = body.pagination.currentPage;
    model.totalPages = body.pagination.totalPages;
    var progress = Math.round((body.pagination.currentPage / body.pagination.totalPages) * 100);
    if(progress <= 24) {
      model.progress = 0;
    } else if (progress <= 49) {
      model.progress = 25;
    } else if (progress <= 74) {
      model.progress = 50;
    } else if (progress <= 99) {
      model.progress = 75;
    } else {
      model.progress = 100;
    }
    console.log('currentPage', model.currentPage, 'totalPages', model.totalPages)

    if (body.pagination.currentPage < body.pagination.totalPages) {
      model.competitors = model.competitors.concat(body.leaderboardRows);

      extractStatistics(body.leaderboardRows);

      let nextUrl = url.replace(/page=\d+/, 'page=' + (body.pagination.currentPage + 1));
      loadFromUrl(nextUrl, done);
    } else {
      model.competitors.sort(function(a, b) {return parseInt(a.overallRank) - parseInt(b.overallRank)});
      done();
    }
  });
}

// start update
loadFromUrls(urls, () => console.log('update done'));

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', model);
});
/* GET changelog. */
router.get('/changelog', function(req, res, next) {
  res.render('changelog', model);
});
/* GET members. */
router.get('/members', function(req, res, next) {
  res.render('members', model);
});
/* GET top10. */
router.get('/top', function(req, res, next) {
  res.render('top10', model);
});
/* GET map. */
router.get('/map', function(req, res, next) {
  res.render('map', model);
});

module.exports = router;
