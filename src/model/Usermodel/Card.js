const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({

    cardname: {
        type: String,
        required: true
    },
    cardnumber: {
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
    }
});


module.exports = mongoose.model('Cards', shoppingCartSchema);