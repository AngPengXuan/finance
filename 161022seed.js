// Include fs module
var fs = require('fs');
const mongoose = require('mongoose');
const finance = require('./models/finance');
const report = require('./models/report');
//console.log('readFile called');
//dbUrl = 'mongodb://localhost:27017/finance';
dbUrl = 'mongodb+srv://pengxuan:zURbgXz9tnX3TpAS@cluster0.fisif7w.mongodb.net/?retryWrites=true&w=majority'
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true})
.then (() => {
    console.log('MONGO CONNECTION OPEN!!')
})
.catch(err => {
    console.log('MONGO CONNECTION ERROR!!');
    console.log(err);
})

const userid = '634243143399709654a885e1'
//const userid = "634225ceced75245a2ce6728";

const outflowCategories = ['Food and Beverages', 'Transport', 'Stationary/office stuff', 'Entertainment', 'Health','Gifts','Investment', 'Education', 'Transfer', 'Others']
const inflowCategories = ['Income/Allowance', 'Investment'];

async function updateData(month, year, category, amount) {
    let found = await report.findOne({month: month, year: year, author: userid}).exec();
    console.log(found);
    if (found === null) {
        for (let i = 0; i < inflowCategories.length; i++) {
            newEntry = new report({
                summary: false,
                outflow: false,
                month: month,
                year: year,
                category: inflowCategories[i],
                amount: 0,
                rank: i,
                author: userid
            })
            await newEntry.save();
        }
        for (let i = inflowCategories.length; i < outflowCategories.length + inflowCategories.length; i++) {
            newEntry = new report({
                summary: false,
                outflow: true,
                month: month,
                year: year,
                category: outflowCategories[i - inflowCategories.length],
                amount: 0,
                rank: i,
                author: userid
            })
            await newEntry.save();
        }
        newEntry = new report({
            summary: true,
            outflow: false,
            month: month,
            year: year,
            category: 'Total Income',
            amount: 0,
            author: userid,
            rank: 1
        })
        await newEntry.save();
        newEntry = new report({
            summary: true,
            outflow: false,
            month: month,
            year: year,
            category: 'Total Expense',
            amount: 0,
            author: userid,
            rank: 2
        })
        await newEntry.save();
        newEntry = new report({
            summary: true,
            outflow: false,
            month: month,
            year: year,
            category: 'Amount Left',
            amount: 0,
            author: userid,
            rank: 3
        })
        await newEntry.save();
        newEntry = new report({
            summary: true,
            outflow: false,
            month: month,
            year: year,
            category: 'Percentage Saved',
            amount: 0,
            author: userid,
            rank: 4
        })
        await newEntry.save();
        found = await report.findOne({month: month, year: year, category: category, author: userid}).exec();
    }
    found = await report.findOne({outflow: true, month: month, year: year, category: category, author: userid}).exec();
    found.amount += Number(amount);
    await found.save();
    let totalExpense = await report.findOne({month: month, year: year, category: 'Total Expense', author: userid});
    let totalIncome = await report.findOne({month: month, year: year, category: 'Total Income', author: userid});
    let amountLeft = await report.findOne({month: month, year: year, category: 'Amount Left', author: userid});
    let percentageSaved = await report.findOne({month: month, year: year, category: 'Percentage Saved', author: userid});
    if (found.outflow) {
        totalExpense.amount += Number(amount);
        await totalExpense.save();
    }
    else
    {
        totalIncome.amount += Number(amount);
        await totalIncome.save();
    }
    amountLeft.amount = totalIncome.amount - totalExpense.amount;
    await amountLeft.save();
    if (totalIncome.amount != 0)
    {
        percentageSaved.amount = (amountLeft.amount / totalIncome.amount) * 100;
        percentageSaved.amount.toFixed(2);
    }
    else 
    {
        percentageSaved.amount = 0;
    }
    await percentageSaved.save();
}

async function loops(data){
    let i = 0;
    while(data[i] !== "#")
    {
        let amount = "", category = "", notes = "", day = "", month = "", year = "";
        while(data[i] !== "/")
        {
            day += data[i]
            i++;
        }
        i++;
        while(data[i] !== "/")
        {
            month += data[i]
            i++;
        }
        i++;
        while(data[i] !== ",")
        {
            year += data[i]
            i++;
        }
        i++;
        while(data[i] !== ",")
        {
            amount += data[i]
            i++;
        }
        i++;
        while(data[i] !== ",")
        {
            category += data[i]
            i++;
        }
        i++;
        while(data[i] !== ",")
        {
            notes += data[i]
            i++;
        }
        let seedFinance =
            {
                outflow: true,
                day: Number(day),
                month: Number(month),
                year: Number(year),
                amount: Number(amount),
                category: category,
                notes: notes,
                author: "634225ceced75245a2ce6728"
            };
        await updateData(seedFinance.month, seedFinance.year, seedFinance.category, seedFinance.amount);
        console.log(seedFinance.month);
        const seedDB = async () => {
            //await finance.deleteMany({})
            await finance.insertMany(seedFinance)
            .then(res => {
                //console.log(res);
            })
            .catch(e => {
                console.log(e);
            })
        }
        seedDB();
        //console.log(seedFinance);
        if (data[i] === "#"){
            break;
        }
        while(data[i] !== '\n')
        {
            i++;
        }
        i++;
    }
}

fs.readFile('161022outflow.csv', 'utf8', function(err, data){
    loops(data);
})