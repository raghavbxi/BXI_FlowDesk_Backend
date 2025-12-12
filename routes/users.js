const express = require('express');
const router = express.Router();
const { getUsers, getUser, updateUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/').get(getUsers);
router.route('/:id').get(getUser).put(updateUser);

module.exports = router;

