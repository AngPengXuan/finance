const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    summary: {
        type: Boolean,
        require: true
    },
    outflow: {
        type: Boolean,
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
    category: {
        type: String
    },
    amount: {
        type: Number
    },
    rank: {
        type: Number
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
})

const report = mongoose.model('report', reportSchema);

module.exports = report;