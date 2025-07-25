require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns').promises;
const { MongoClient } = require('mongodb');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
const mongoUri = 'mongodb+srv://rehanbutt15555:GWhDALqTwve3QEML@cluster0.9z7ksf8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' || 'mongodb://localhost:27017';
const dbName = 'urlshortener';
let db;

// MongoDB Connection
async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));

// Root route
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Hello API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// POST endpoint to create short URL
app.post('/api/shorturl', async function(req, res) {
  const originalUrl = req.body.url;

  // Validate URL format
  const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Extract hostname for DNS lookup
  let hostname;
  try {
    hostname = new URL(originalUrl).hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // Validate URL with dns.lookup
  try {
    await dns.lookup(hostname);
    const urlsCollection = db.collection('urls');

    // Check if URL already exists
    const existingUrl = await urlsCollection.findOne({ original_url: originalUrl });
    if (existingUrl) {
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url
      });
    }

    // Get the next short_url
    const counter = await urlsCollection.countDocuments();
    const shortUrl = counter + 1;

    // Store URL in MongoDB
    await urlsCollection.insertOne({
      original_url: originalUrl,
      short_url: shortUrl
    });

    res.json({
      original_url: originalUrl,
      short_url: shortUrl
    });
  } catch (err) {
    res.json({ error: 'invalid url' });
  }
});

// GET endpoint to redirect to original URL
app.get('/api/shorturl/:short_url', async function(req, res) {
  const shortUrl = parseInt(req.params.short_url, 10);

  if (isNaN(shortUrl)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const urlsCollection = db.collection('urls');
    const urlDoc = await urlsCollection.findOne({ short_url: shortUrl });

    if (!urlDoc) {
      return res.json({ error: 'invalid url' });
    }

    res.redirect(301, urlDoc.original_url);
  } catch (err) {
    res.json({ error: 'invalid url' });
  }
});

// Connect to MongoDB and start server
connectToMongo().then(() => {
  app.listen(port, function() {
    console.log(`Listening on port ${port}`);
  });
});