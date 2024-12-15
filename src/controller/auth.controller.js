const User = require('../model/Usermodel/User')
const Notifications = require('../model/Usermodel/Notification')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin'); // Ensure Firebase Admin SDK is initialized
// const Wishlist = require('../model/Wishlist');
// const WishlistProduct = require('../model/Wishlist_product');

const authController = {
  //Get All users
  getAllUsers: async (req, res) => {
    try {
      const user = await User.find();
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json(error)
    }
  },

  //GENERATE ACCESS TOKEN
  generateAcessToken: (user) => {
    return jwt.sign({
      id: user._id,
      role: user.role
    }, process.env.JWT_ACCESS_KEY)
  },

  //GENERATE REFRESH TOKEN
  generateRefreshToken: (user) => {
    return jwt.sign({
      id: user._id,
      role: user.role
    }, process.env.JWT_FRESH_KEY,
      { expiresIn: '7d' })
  },


  //REGISTER user
  registerUser: async (req, res) => {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(req.body.password, salt);
      // const {User} = await connectDB();
      // Create User

      //check userame exists ?
      const checkuser = await User.findOne({ user_name: req.body.username })
      if (checkuser) {
        return res.status(400).json({ message: 'username already exists' });
      }
      //check email exists ?
      const checkemail = await User.findOne({ email: req.body.email })
      if (checkemail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      const newUser = {
        user_name: req.body.username,
        real_name: req.body.realname,
        email: req.body.email,
        password: hashed,
        phone_number: req.body.phonenumber,
        address: req.body.address,
        role: 1
      }

      // Save user to the database
      await User.create(newUser)

      res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  //LOGIN
  loginUser: async (req, res) => {
    try {
        // Thêm .select('+password') để lấy password field
        const user = await User.findOne({ user_name: req.body.username }).select('+password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Thêm log để debug
        console.log("Found user:", {
            id: user._id,
            role: user.role,
            username: user.user_name
        });

        if (!req.body.password || req.body.password.trim() === '') {
            return res.status(404).json({ message: 'Password is required' });
        }

        const comparePassword = await bcrypt.compare(req.body.password, user.password);
        if (!comparePassword) {
            return res.status(404).json({ message: 'Wrong password' });
        }

        // Generate tokens
        const accesstoken = authController.generateAcessToken(user);
        const refreshToken = authController.generateRefreshToken(user);

        // Log token payload
        console.log("Token payload:", {
            id: user._id,
            role: user.role
        });

        res.cookie('freshtoken', refreshToken, {
            httpOnly: true,
            secure: false,
            path: '/',
            sameSite: "strict"
        });

        const { password, __v, ...others } = user._doc;
        return res.status(200).json({ 
            message: 'Login successful!', 
            accesstoken, 
            user: { id: user._id, role: user.role, ...others }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
  },

  updatePhoneNumber: async (req, res) => {
    try {
      const userId = req.user.id;  // Get user ID from the URL parameters
      const { newPhoneNumber } = req.body;

      // 1. Find the user by user_id 
      const user = await User.findOne({ user_id: userId });
      // Check if user exists
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // 2. Update the user's phone number
      user.phone_number = newPhoneNumber;

      // 3. Save the updated user 
      await user.save();
      // 4. Return success message
      res.status(200).json({ message: 'Phone number updated successfully', user });

    } catch (error) { // 5. Catch error
      console.error('Error updating phone number:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  updateEmail: async (req, res) => {//update email
    try {
      const userId = req.user.id;
      const { newEmail } = req.body;

      // 1. Find the user by user_id
      const user = await User.findOne({ user_id: userId });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // 2. Update the user's email
      user.email = newEmail;

      // 3. Save the updated user 
      await user.save();

      res.status(200).json({ message: 'Email updated successfully', user });

    } catch (error) {
      // 4. Catch error
      console.error('Error updating email:', error);

      // Check for duplicate key error (email already exists)
      if (error.code === 11000 && error.keyPattern.email === 1) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      res.status(500).json({ message: 'Server error' });
    }
  },
  updatePassword: async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // 1. Find the user by user_id
      const user = await User.findOne({ _id: userId }).select('+password'); // Temporarily include password

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // 2. Compare currentPassword with the hashed password in the database 
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Incorrect current password' });
      }

      // 3. Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);

      // 4. Update the password 
      user.password = hashedNewPassword;

      // 5. Save the updated user 
      await user.save();

      res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  updateUserAddresses: async (req, res) => {
    try {
      const userId = req.params.userId; // Assuming you pass the user ID in the route
      const newAddress = {
        street: req.body.street,
        city_province: req.body.city_province
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $push: { addresses: newAddress } },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user addresses', error: error.message });
    }
  },
  // addRealName: async (req, res) => {
  //     const userId = req.params.userId;
  //     const { realName } = req.body;
  // },
  addAddress: async (req, res) => {
    try {
      const userId = req.params.userId;
      const newAddress = req.body.address; // Assuming you send the new address in the request body

      // Find the user
      const user = await User.findOne({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Push the new address to the addresses array
      user.addresses.push(newAddress);

      // Save the updated user
      await user.save();

      res.status(200).json({ message: 'Address added successfully', user });

    }
    catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  updateAddress: async (req, res) => {
    try {
      const userId = req.params.userId;
      const addressIndex = req.params.addressIndex; // Get the index from the URL
      const updatedAddress = req.body.address;

      // Find the user
      const user = await User.findOne({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if the address index is valid
      if (addressIndex < 0 || addressIndex >= user.addresses.length) {
        return res.status(400).json({ message: 'Invalid address index' });
      }

      // Update the address at the specified index
      user.addresses[addressIndex] = updatedAddress;

      // Save the updated user
      await user.save();

      res.status(200).json({ message: 'Address updated successfully', user });

    } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  updateAvatar: async (req, res) => {
    try {
      const userId = req.user.id;
      const fileData = req.file || [req.file];
      console.log(fileData.path);
      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      // Get file path from cloudinary
      const filePath = req.file.path;

      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { profileImage: fileData.path } }, // Use $set instead of $push if you want to replace the old image
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        data: updatedUser
      });

    } catch (error) {
      console.error("Error updating avatar:", error);
      res.status(500).json({
        success: false,
        message: "Error updating avatar",
        error: error.message
      });
    }
  },

  // get user profile by token
  getUserProfile: async (req, res) => {
    try {
      const userId = req.user.id; // Assuming you have the user ID in the request object
      const user = await User.findById(userId); // Use the User model to find the user by ID
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { password, isBlocked, role, stripeCustomerId, ...others } = user._doc;
      res.status(200).json({ message: 'User Profile:', ...others }); // Send the user data as a JSON response
    } catch (error) {
      res.status(500).json({ message: 'Error getting user profile', error: error.message });
    }
  },

  // get history product bought by user
  socialLogin: async (req, res) => {
    try {
      const { firebaseToken } = req.headers;

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const { uid, email, name, picture } = decodedToken;

      // Check if user already exists
      let user = await User.findOne({ email });

      if (!user) {
        // Create new user if not exists
        user = new User({
          user_name: name,
          email: email,
          profileImage: picture,
          firebaseUid: uid,
          role: 1, // Default role, adjust as needed
        });
        await user.save();
      }

      // Generate access and refresh tokens
      const accessToken = authController.generateAcessToken(user);
      const refreshToken = authController.generateRefreshToken(user);

      res.status(200).json({
        message: 'Social login successful!',
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.user_name,
          profileImage: user.profileImage,
        },
      });
    } catch (error) {
      console.error('Error in social login:', error);
      res.status(500).json({ message: 'Server error during social login' });
    }
  },

  firebaseSocialLogin: async (req, res) => {
    try {
      const { firebaseToken } = req.body;

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const { uid, email, name, picture } = decodedToken;

      // Check if user already exists
      let user = await User.findOne({ email });

      if (!user) {
        // Create new user if not exists
        user = new User({
          user_name: name,
          email: email,
          profileImage: picture,
          firebaseUid: uid,
          role: 1, // Default role, adjust as needed
        });
        await user.save();
      }

      // Generate access and refresh tokens
      const accessToken = authController.generateAcessToken(user);
      const refreshToken = authController.generateRefreshToken(user);

      res.status(200).json({
        message: 'Social login successful!',
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.user_name,
          profileImage: user.profileImage,
        },
      });
    } catch (error) {
      console.error('Error in social login:', error);
      res.status(500).json({ message: 'Server error during social login' });
    }
  },
}

module.exports = authController;