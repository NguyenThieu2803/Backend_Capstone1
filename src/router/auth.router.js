const express = require('express');
const authController = require('../controller/auth.controller');
const authmiddlewareControll = require('../middleware/auth.middleware');

const router = express.Router();


router.get('/api/auth/', authController.getAllUsers);
router.post('/api/auth/register', authController.registerUser)
router.post('/api/auth/login', authController.loginUser)
router.put('/api/auth/users/:userId/phone', authController.updatePhoneNumber);
router.put('/api/auth/users/:userId/email',authmiddlewareControll.verifyUser, authController.updateEmail);
router.put('/api/auth/users/:userId/password', authController.updatePassword);
router.post('/api/auth/users/:userId/addresses', authController.addAddress);
router.put('/api/auth/users/:userId/addresses/:addressIndex', authController.updateAddress); 




module.exports = router;
