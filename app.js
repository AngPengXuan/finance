const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
require('./auth');
// app.use( express.static( "public" ) );
app.use(express.static(__dirname + '/public'));
require('dotenv').config();
const flash = require('connect-flash');
//const AppError = require('./AppError');
const MongoStore = require('connect-mongo');

//connect mongoose database
//'mongodb://localhost:27017/finance'
const dbUrl = process.env.DB_URL;
//const dbUrl = 'mongodb://localhost:27017/finance';
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!")
    })
    .catch(err => {
        console.log("MONGO CONNECTION ERROR!")
        console.log(err)
    })

function isLoggedIn(req, res, next) {
    //req.user ? next() : res.redirect('/login');
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
}

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: process.env.secret
    }
});

store.on("error", function(e) {
    console.log("SESSION STORE ERROR")
})

const sessionConfig = {
    store,
    name: 'session',
    secret: process.env.secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

//serialise get data
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let dateDesc = true, amountDesc = true, dateChanged = false, amountChanged = false;

const finance = require('./models/finance');
const users = require('./models/user');
const report = require('./models/report');
const { type } = require('os');

const outflowCategories = ['Food and Beverages', 'Transport', 'Stationary/office stuff', 'Entertainment', 'Health','Gifts','Investment', 'Education', 'Transfer', 'Others']
const inflowCategories = ['Income/Allowance', 'Investment'];

let today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();

today = yyyy + '-' + mm + '-' + dd;

function toFixed(num, fixed) {
    var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return num.toString().match(re)[0];
}

function changeData(req, bool) {
    let type, day = "", month = "", year = "";
    type = bool;
    for (let i = 0; i < 4; i++)
    {
        year += req.body.date[i];
    }
    for (let i = 5; i < 7; i++)
    {
        month += req.body.date[i];
    }
    for (let i = 8; i < 10; i++)
    {
        day += req.body.date[i];
    }
    const tmpEntry = {
        outflow: type,
        day: day,
        month: month,
        year: year,
        amount: req.body.amount,
        category: req.body.category,
        notes: req.body.notes
    };
    return tmpEntry;
}

async function updateData(req) {
    let month = "", year = "";
    for (let i = 0; i < 4; i++)
    {
        year += req.body.date[i];
    }
    for (let i = 5; i < 7; i++)
    {
        month += req.body.date[i];
    }
    let found = await report.findOne({month: month, year: year, category: req.body.category}).exec();
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
                author: req.user._id
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
                author: req.user._id
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
            author: req.user._id,
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
            author: req.user._id,
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
            author: req.user._id,
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
            author: req.user._id,
            rank: 4
        })
        await newEntry.save();
        found = await report.findOne({month: month, year: year, category: req.body.category, author: req.user._id}).exec();
    }
    found.amount += Number(req.body.amount);
    await found.save();
    let totalExpense = await report.findOne({month: month, year: year, category: 'Total Expense', author: req.user._id});
    let totalIncome = await report.findOne({month: month, year: year, category: 'Total Income', author: req.user._id});
    let amountLeft = await report.findOne({month: month, year: year, category: 'Amount Left', author: req.user._id});
    let percentageSaved = await report.findOne({month: month, year: year, category: 'Percentage Saved', author: req.user._id});
    if (found.outflow) {
        totalExpense.amount += Number(req.body.amount);
        await totalExpense.save();
    }
    else
    {
        totalIncome.amount += Number(req.body.amount);
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

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'))

app.get('/', isLoggedIn, (req, res) => {
    res.render('home');
})

app.get('/register', (req, res) => {
    res.render('register', {messages: req.flash('error')});
})

app.post('/register', async (req, res) => {
    //res.send(req.body);
    try {
        const {email, username, password} = req.body;
        const user = new User({email, username});
        const registeredUser =  await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            res.redirect('/data');
        })
    } catch(e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
})

app.get('/login', (req, res) => {
    res.render('login', {messages: req.flash('error')});
})

app.post('/login', passport.authenticate('local', {failureFlash: true, failureRedirect: '/login'}), (req,res) => {
    res.redirect('/data');
})

app.get('/auth/google', 
    passport.authenticate('google', { scope: ['email', 'profile']})
)

app.get('/auth/google/callback',
    passport.authenticate('google', {
        //successRedirect: '/data',
        failureFlash: true,
        failureRedirect: '/login',
    }), async (req, res) => {
        const user = await users.findById('634225ceced75245a2ce6728');
        //console.log(user);
        req.login(user, err => {
            //if (err) return next(err);
            res.redirect('/data');
        })
    }
);

app.get('/auth/failure', (req, res) => {
    res.send('something went wrong');
})

app.get('/data', isLoggedIn, async (req,res) => {
    const user_id = req.user._id;
    let data, test = dateDesc? -1 : 1;
    if (dateDesc && dateChanged)
    {
        data = await finance.find({author: user_id}).sort({year: -1, month: -1, day: -1, amount: amountDesc? -1 : 1})
    }
    else if (!dateDesc && dateChanged)
    {
        data = await finance.find({author: user_id}).sort({year: 1, month: 1, day: 1, amount: amountDesc? -1 : 1})
    }
    else if (amountDesc && amountChanged)
    {
        data = await finance.find({author: user_id}).sort({amount: -1, year: test, month: test, day: test})
    }
    else if (!amountDesc && amountChanged)
    {
        data = await finance.find({author: user_id}).sort({amount: 1, year: test, month: test, day: test})
    }
    else{
        data = await finance.find({author: user_id}).sort({year: -1, month: -1, day: -1, amount: amountDesc? -1 : 1})
    }
    //console.log(data);
    //res.send("OUTFLOW");
    amountChanged = false;
    dateChanged = false;
    res.render('data', {data, dateDesc, amountDesc});
})

app.get('/outflowReport', isLoggedIn, async (req, res) => {
    let m = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    let test = await report.find({outflow: true, author: req.user._id}).sort({year: -1, month: -1, rank: 1});
    let len = outflowCategories.length;
    //console.log(dataList);

    res.render('outflowReport', {test, outflowCategories, len, m});
})

app.get('/inflowReport', isLoggedIn, async (req, res) => {
    let m = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    let test = await report.find({outflow: false, summary: false, author: req.user._id}).sort({year: -1, month: -1, rank: 1});
    let len = inflowCategories.length;
    res.render('inflowReport', {test, inflowCategories, len, m})
})

app.get('/summary', isLoggedIn, async (req, res) => {
    let m = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    let test = await report.find({summary: true, author: req.user._id}).sort({year: -1, month: -1, rank: 1});
    let len = 4;
    res.render('summary', {test, len, m})
})

app.post('/logout', (req,res) => {
    //req.session.user_id = null;
    req.session.destroy();
    res.redirect('/');
})

app.post('/datadate', isLoggedIn, async (req, res) => {
    //console.log(req.body.dropdown);
    if (req.body.datadate === "down")
    {
        dateDesc = true;
        dateChanged = true;
        amountChanged = false;
    }
    else
    {
        dateDesc = false;
        dateChanged = true;
        amountChanged = false;
    }
    res.redirect('/data');
})

app.post('/dataamount', isLoggedIn, async (req, res) => {
    if (req.body.dataamount === "down")
    {
        amountDesc = true;
        dateChanged = false;
        amountChanged = true;
    }
    else
    {
        amountDesc = false;
        dateChanged = false;
        amountChanged = true;
    }
    res.redirect('/data');
})

app.get('/outflow', isLoggedIn, async (req, res) => {
    let dataList = await finance.find({outflow: true, author: req.user._id}).sort({notes: 1});
    let uniqueData = [];
    for (let data of dataList) {
        uniqueData.push(data.notes);
    }
    uniqueData = new Set(uniqueData);
    res.render('outflow', {outflowCategories, today, uniqueData});
})
app.get('/inflow', isLoggedIn, async (req, res) => {
    let dataList = await finance.find({outflow: false, author: req.user._id}).sort({notes: 1});
    let uniqueData = [];
    for (let data of dataList) {
        uniqueData.push(data.notes);
    }
    uniqueData = new Set(uniqueData);
    res.render('inflow', {inflowCategories, today, uniqueData});
})
app.post('/newOutflow', isLoggedIn, async (req,res) => {
    const newEntry = new finance(changeData(req, true));
    newEntry.author = req.user._id;
    await newEntry.save();
    updateData(req);
    res.redirect("/data");
})
app.post('/newInflow', isLoggedIn, async (req,res) => {
    let newEntry = new finance(changeData(req, false));
    newEntry.author = req.user._id;
    await newEntry.save();
    updateData(req);
    res.redirect("/data");
})

app.get('/data/:id/edit', isLoggedIn, async (req,res) => {
    const { id } = req.params;
    const entry = await finance.findById(id);

    let month = entry.month, year = entry.year;
    let found = await report.findOne({month: month, year: year, category: entry.category}).exec();
    found.amount -= Number(entry.amount);
    await found.save();

    let totalExpense = await report.findOne({month: month, year: year, category: 'Total Expense', author: req.user._id});
    let totalIncome = await report.findOne({month: month, year: year, category: 'Total Income', author: req.user._id});
    let amountLeft = await report.findOne({month: month, year: year, category: 'Amount Left', author: req.user._id});
    let percentageSaved = await report.findOne({month: month, year: year, category: 'Percentage Saved', author: req.user._id});
    if (found.outflow) {
        totalExpense.amount -= Number(entry.amount);
        await totalExpense.save();
    }
    else
    {
        totalIncome.amount -= Number(entry.amount);
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


    // console.log(entry.author._id.toString());
    console.log(entry);
    if (entry.author._id.toString() !== req.user._id)
    {
        return res.redirect('/data');    
    }
    let tmpDate = "";
    tmpDate = entry.year + "-";
    entry.month < 10 ? tmpDate += "0" : '';
    tmpDate += entry.month + "-";
    entry.day < 10 ? tmpDate += "0" : '';
    tmpDate += entry.day;
    if (entry.outflow) {
        res.render('editOutflow', {entry, outflowCategories, tmpDate})
    }
    else {
        res.render('editInflow', {entry, inflowCategories, tmpDate})
    }
})

app.post('/data/:id', isLoggedIn, async (req,res) => {
    const { id } = req.params;
    updateData(req);
    const entry = await finance.findByIdAndUpdate(id, changeData(req), {runValidators: true, new: true});
    res.redirect('/data');
})

app.delete('/data/:id', isLoggedIn, async (req,res) => {
    const { id } = req.params;
    //console.log('deleted');
    let find = await finance.findById(id);
    let month = find.month, year = find.year;
    let found = await report.findOne({month: month, year: year, category: find.category}).exec();
    found.amount -= Number(find.amount);
    await found.save();
    const deleted = await finance.findByIdAndDelete(id);

    let totalExpense = await report.findOne({month: month, year: year, category: 'Total Expense', author: req.user._id});
    let totalIncome = await report.findOne({month: month, year: year, category: 'Total Income', author: req.user._id});
    let amountLeft = await report.findOne({month: month, year: year, category: 'Amount Left', author: req.user._id});
    let percentageSaved = await report.findOne({month: month, year: year, category: 'Percentage Saved', author: req.user._id});
    if (found.outflow) {
        totalExpense.amount -= Number(find.amount);
        await totalExpense.save();
    }
    else
    {
        totalIncome.amount -= Number(find.amount);
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

    res.redirect('/data');
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`APP IS LISTENING ON PORT ${port}`)
}) 