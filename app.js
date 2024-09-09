const express = require('express');
const connectDB = require('./db')
const Currency = require('./currency');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
app.use(express.json());

connectDB();

// ------------------------------ Data Loading Functions ------------------------------

async function fetchAndStoreEmtiaGoldSilverPrices() {
    try {
        // Define the API endpoints
        const endpoints = [
            'https://api.gold-api.com/price/XAU',
            'https://api.gold-api.com/price/XAG'
        ];

        for (const endpoint of endpoints) {
            const response = await axios.get(endpoint);

            if (response.status === 200) {
                const data = response.data;
                const name = `${data.name}/${data.symbol}`;
          
                const currencyData = {
                    category: 'emtia',
                    name: name,
                    description: data.name,
                    buyPrice: data.price, 
                    sellPrice: data.price,
                    spread: 0 
                };

                await Currency.findOneAndUpdate(
                    { name: name, category: 'emtia' },
                    currencyData,
                    { upsert: true, new: true }
                );
                
                console.log(`Stored data for ${name}`);
            } else {
                console.error(`Failed to fetch data from ${endpoint}`);
            }
        }
    } catch (error) {
        console.error('Error fetching or storing data:', error);
    }
}

async function loadCurrencyDataToDB() {
    try {
        const response = await axios.get('https://openexchangerates.org/api/latest.json?app_id=80921a85ca6d44079d824345527ed736');
        const currencyData = response.data;

        const { base, rates } = currencyData;

        for (let [currencyCode, rate] of Object.entries(rates)) {
            const name = `${base}/${currencyCode}`;  
            const buyPrice = rate;
            const sellPrice = buyPrice * 1.01;
            const spread = sellPrice - buyPrice;

            await Currency.findOneAndUpdate(
                { name },  
                {
                    category: 'currency', 
                    name,
                    description: `Exchange rate for ${base} to ${currencyCode}`,
                    buyPrice,
                    sellPrice,
                    spread
                },
                { upsert: true, new: true } 
            );
        }

        console.log('Currency data updated successfully');
    } catch (error) {
        console.error('Error updating currency data:', error);
    }
}

const fetchAndUpdateCryptoCurrencyData = async () => {
    try {
        const apiUrl = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=300';
        const apiKey = '7cc1fe82-89b1-4b66-8086-30551da18065';
        const response = await axios.get(apiUrl, {
            headers: {
              'X-CMC_PRO_API_KEY': apiKey
            }
          }); 
        const data = response.data.data;

        for (let item of data) {
            const { name, symbol, quote } = item;
            const buyPrice = quote.USD.price;
            const sellPrice = buyPrice * 1.01;
            const spread = sellPrice - buyPrice;

            await Currency.findOneAndUpdate(
                { name }, 
                {
                    category: 'cryptocurrency',
                    name,
                    description: `${name} (${symbol})`,
                    buyPrice,
                    sellPrice,
                    spread
                },
                { upsert: true, new: true }
            );
        }
        console.log('Crypto data updated.');
    } catch (error) {
        console.error('Error fetching or saving data:', error);
    }
};

async function loadShareDataToDB() {
    try {
        const response = await axios.get('https://financialmodelingprep.com/api/v3/symbol/NASDAQ?apikey=9G8MfK4osIBx78j30S7GFrwMCDaIsVle');
        const shareData = response.data;

        for (let share of shareData) {
            const { name, symbol, price } = share;
            const buyPrice = price;
            const sellPrice = buyPrice * 1.01;
            const spread = sellPrice - buyPrice;

          
            await Currency.findOneAndUpdate(
                { name },  
                {
                    category: 'share', 
                    name,
                    description: `${name} (${symbol})`,
                    buyPrice,
                    sellPrice,
                    spread
                },
                { upsert: true, new: true }
            );
        }

        console.log('Shares data updated successfully');
    } catch (error) {
        console.error('Error updating shares data:', error);
    }
}

async function fetchAndStoreEmtiaData() {
    try {
        // API call to get the data (replace with the actual API URL)
        const response = await axios.get('https://api.collectapi.com/economy/emtia', {
            headers: {
              'authorization': 'apikey 7i79IBBmamdwwNFAeT2TDS:2LcLXot5nr1JJaE2dMKCpr'
            }
          });
        const emtiaData = response.data.result;

        // Process each item in the result
        for (let item of emtiaData) {
            const { name, text, buying, selling } = item;

            // Calculate spread
            const spread = selling - buying;

            // Find if the document already exists by name
            const existingItem = await Currency.findOne({ name });

            if (existingItem) {
                // Update if it already exists
                await Currency.updateOne(
                    { name },
                    {
                        category: 'emtia',
                        description: text,
                        buyPrice: buying,
                        sellPrice: selling,
                        spread: spread
                    }
                );
            } else {
                // Create a new document if it doesn't exist
                const newItem = new Currency({
                    category: 'emtia',
                    name: name,
                    description: text,
                    buyPrice: buying,
                    sellPrice: selling,
                    spread: spread
                });
                await newItem.save();
            }
        }
    } catch (error) {
        console.error('Error fetching and storing emtia data:', error);
    }
}


// ------------------------------ API Endpoints Helpers ------------------------------


async function retrieveSharesData(req, res) {
    try {
        const { category } = req.query; 
        let filter = {};

        if (category) {
            filter = { category };
        }

        const data = await Currency.find({category: 'share'});
        res.status(200).json(data);
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).send('Error retrieving data');
    }
}

async function getCurrencyData(req, res) {
    try {
        const currencies = await Currency.find({ category: 'currency' });
        res.status(200).json({
            success: true,
            data: currencies,
        });
    } catch (error) {
        console.error('Error retrieving currency data:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving currency data',
        });
    }
}

async function getCryptoCurrencyData(req, res) {
    try {
        const currencies = await Currency.find({category: 'cryptocurrency'});
        res.status(200).json(currencies);
    } catch (error) {
        res.status(500).send('Error fetching crypto data');
    }
}

async function getEmtiaData(req, res) {
    try {
      const emtiaData = await Currency.aggregate([
        { $match: { category: 'emtia' } },
        { 
          $addFields: { 
            sortOrder: { 
              $switch: { 
                branches: [ 
                  { case: { $regexMatch: { input: "$name", regex: /^gold|xau$/i } }, then: 1 },
                  { case: { $regexMatch: { input: "$name", regex: /^silver|xag$/i } }, then: 2 }
                ], 
                default: 3 
              } 
            } 
          } 
        },
        { $sort: { sortOrder: 1, name: 1 } }, // Sort by sortOrder first, then by name
        { $project: { sortOrder: 0 } } // Remove the sortOrder field from the final result
      ]);

  
      res.status(200).json(emtiaData);
    } catch (error) {
      console.error('Error fetching emtia data:', error);
      res.status(500).json({ error: 'Error fetching emtia data' });
    }
  }


// ------------------------------ Cron Jobs ------------------------------

cron.schedule('*/7 * * * *', fetchAndUpdateCryptoCurrencyData);
cron.schedule('*/45 * * * *', loadCurrencyDataToDB);
cron.schedule('*/6 * * * *', loadShareDataToDB);
cron.schedule('*/480 * * * *', fetchAndStoreEmtiaData);
cron.schedule('*/1 * * * *', fetchAndStoreEmtiaGoldSilverPrices);



// ------------------------------ API Endpoints ------------------------------

app.get('/load-share-data', async (req, res) => {
    await loadShareDataToDB();
    res.status(200).send('Share data loading started');
});

app.get('/load-currency-data', async (req, res) => {
    await loadCurrencyDataToDB();
    res.status(200).send('Currency data loading started');
});
app.get('/update-crypto', async (req, res) => {
    try {
        await fetchAndUpdateCryptoCurrencyData();
        res.status(200).send('Crypto data updated and saved to DB');
    } catch (error) {
        res.status(500).send('Error updating crypto data');
    }
});

app.get('/currency-data', getCurrencyData);

app.get('/share-data', retrieveSharesData); 

app.get('/get-crypto', getCryptoCurrencyData);

app.get('/get-emtia', getEmtiaData);

const port = 5000;

app.listen(port, () => {
    console.log("API server started on port 5000");
})