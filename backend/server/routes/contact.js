const express = require('express');
const router = express.Router();
const limiter = require('../middlewares/rate-limit');
const { sendContact } = require('../controllers/contact');

// plus strict: 5 req / min / IP
router.use(limiter('/contact', { max: 5 }));

router.post('/', sendContact);

module.exports = router;