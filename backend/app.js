const express = require('express')
require('dotenv').config();
const app = express() 
// const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const contactRoute = require('./server/routes/contact')
const subscribeRoute = require('./server/routes/subscribe')

// mongoose.connect(process.env.MONGODB_URI)
// .then(() => console.log('MongoDB OK'))
// .catch(err => console.error('MongoDB KO', err));

app.use(express.json()) //intercepte requete json et mise à dispo req.body donc le corps de la requête

app.use(cookieParser(process.env.COOKIE_SECRET || 'c00df84a535abfa04d20024f017d28f535065caefd6d288c1859a18ab1594a45a0f0cac8d0181bb2e973c87425b3e9fa3d3aa1e6e317ef97334a1bce566a12e2'))

// Confiance envers le proxy (Apache/Passenger)
app.set('trust proxy', 1);

// CORS ciblé
const allowedOrigins = [
  process.env.FRONT_URL,
  'https://www.astridbirka.fr',
  'https://astridbirka.fr'
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/v1/subscribe', subscribeRoute);
app.use('/api/v1/contact', contactRoute);

app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// 404 JSON
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Gestion d'erreurs JSON
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
});

module.exports = app