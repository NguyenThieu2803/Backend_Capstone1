const express = require('express');
const router = express.Router();
const userController = require('../controller/User.controller');

router.get('/getproductbycategory/:categoryId', userController.getProductsByCategory);

module.exports = router;
