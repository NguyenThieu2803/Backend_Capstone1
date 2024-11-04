const mongoose = require('mongoose');
const uuid = require('uuid'); // You might need to install this package

const CardSchema = new mongoose.Schema({
    user_id: String,
    Card_name: {
        type: String,
        required: true
    },
    Cardnumber: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{16}$/
    },
    cardExpmonth: {
        type: String,
        required: true,
    },
    cardExpyears: {
        type: String,
        required: true
    },
    cardCVC: {
        type: String,
        required: true
    },
    customerId: {
        type: String,
        required: false
    },
    cardId: {
        type: String,
        unique: true,
        default: () => uuid.v4() // Generate a unique UUID for each new card
    }
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);
