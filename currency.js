const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
    {
        Category: {
            type: String,
            required: true
        },
        Name: {
            type: String,
            required: true
        },
        Description: {
            type: String,
            required: true
        },
        BuyPrice: {
            type: Number,
            required: true
        },
        SellPrice: {
            type: Number,
            required: true
        },
        Spread: {
            type: Number,
            required: true
        }
    });

    const Currency = mongoose.model('Currency', modelSchema);

    module.exports = Currency;