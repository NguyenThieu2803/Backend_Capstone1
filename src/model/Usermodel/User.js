const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  user_name: {
    type:String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
  },
  password:{
    type: String,
    required: true,
    minlength: 4,
    select: true // do not return password in response
  },
  
  phone_number: String,
  addresses: String,
  role: Number
});

module.exports = mongoose.model('User', userSchema);
