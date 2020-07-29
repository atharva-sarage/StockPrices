const mongoose = require('mongoose');
const stockSchema = new mongoose.Schema({
    stockId : {
        type: String,
        required: true
    },
    lowerLimit : {
        type: String,
    },
    upperLimit : {
        type: String,
    },
    amountInvested : {
        type: String
    },
    buyingPrice: {
        type: String
    }
})

module.exports = mongoose.model('Stock',stockSchema)