const express = require('express');
const router = express.Router();
const limiter = require('../middlewares/rate-limit')
const {handleSubscribe} = require('../controllers/subscribe')

// Anti-abus: 10 req / min / IP
router.use(limiter('/subscribe', { max: 10 }));

router.post('/', handleSubscribe);

module.exports = router;