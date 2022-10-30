const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
    outflow: {
        type: Boolean,
        require: true
    },
    day: {
        type: Number,
        require: true
    },
    month: {
        type: Number,
        require: true
    },
    year: {
        type: Number,
        require: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
    },
    notes: {
        type: String
    },
    source: {
        type: String
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
})

const finance = mongoose.model('finance', financeSchema);

module.exports = finance;