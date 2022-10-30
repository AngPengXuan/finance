const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    outflow: {
        type: Boolean,
        require: true
    },
    categories: {
        type: String,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
})

const category = mongoose.model('category', categorySchema);

module.exports = category;