const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        buyPrice: {
            type: Number,
            required: true
        },
        sellPrice: {
            type: Number,
            required: true
        },
        spread: {
            type: Number,
            required: true
        }
    });

    const Currency = mongoose.model('Currency', modelSchema);

    module.exports = Currency;