require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const app = express();

const port = process.env.PORT || 3000;

const urlDatabase = {};
let shortUrlCounter = 1;

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', function (req, res) {
  const originalUrl = req.body.url;

  const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  let hostname;
  try {
    hostname = new URL(originalUrl).hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    const shortUrl = shortUrlCounter++;
    urlDatabase[shortUrl] = originalUrl;

    res.json({
      original_url: originalUrl,
      short_url: shortUrl
    });
  });
});

app.get('/api/shorturl/:short_url', function (req, res) {
  const shortUrl = req.params.short_url;
  const originalUrl = urlDatabase[shortUrl];

  if (!originalUrl) {
    return res.json({ error: 'No short URL found' });
  }

  res.redirect(originalUrl);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});