const mongoose = require('mongoose');
const finance = require('./models/finance');

mongoose.connect('mongodb://localhost:27017/finance', { useNewUrlParser: true, useUnifiedTopology: true})
.then (() => {
    console.log('MONGO CONNECTION OPEN!!')
})
.catch(err => {
    console.log('MONGO CONNECTION ERROR!!');
    console.log(err);
})

const seedFinance = [
    {
        outflow: true,
        day: 18,
        month: 9,
        year: 2022,
        amount: 500,
        category: "Education",
        notes: "CDC driving"
    },
    {
        outflow: true,
        day: 18,
        month: 9,
        year: 2022,
        amount: 12,
        category: "Others",
        notes: "haircut"
    },
];

const seedDB = async () => {
    await finance.deleteMany({})
    await finance.insertMany(seedFinance)
    .then(res => {
        console.log(res);
    })
    .catch(e => {
        console.log(e);
    })
}

seedDB().then(() => {
    mongoose.connection.close();
}) ;