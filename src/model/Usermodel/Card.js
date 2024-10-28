const mongoose = require('mongoose');

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
        required: true
    },
    cardId: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);
