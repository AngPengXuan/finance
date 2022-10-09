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
            res.redirect('/summary');
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
    res.redirect('/summary');
})

app.get('/auth/google', 
    passport.authenticate('google', { scope: ['email', 'profile']})
)

app.get('/auth/google/callback',
    passport.authenticate('google', {
        //successRedirect: '/summary',
        failureFlash: true,
        failureRedirect: '/login',
    }), async (req, res) => {
        const user = await users.findById('634225ceced75245a2ce6728');
        //console.log(user);
        req.login(user, err => {
            if (err) return next(err);
            res.redirect('/summary');
        })
    }
);

app.get('/auth/failure', (req, res) => {
    res.send('something went wrong');
})

app.get('/summary', isLoggedIn, async (req,res) => {
    const user_id = req.user._id;
    let summary, test = dateDesc? -1 : 1;
    if (dateDesc && dateChanged)
    {
        summary = await finance.find({author: user_id}).sort({year: -1, month: -1, day: -1, amount: amountDesc? -1 : 1})
    }
    else if (!dateDesc && dateChanged)
    {
        summary = await finance.find({author: user_id}).sort({year: 1, month: 1, day: 1, amount: amountDesc? -1 : 1})
    }
    else if (amountDesc && amountChanged)
    {
        summary = await finance.find({author: user_id}).sort({amount: -1, year: test, month: test, day: test})
    }
    else if (!amountDesc && amountChanged)
    {
        summary = await finance.find({author: user_id}).sort({amount: 1, year: test, month: test, day: test})
    }
    else{
        summary = await finance.find({author: user_id}).sort({year: -1, month: -1, day: -1, amount: amountDesc? -1 : 1})
    }
    //console.log(summary);
    //res.send("OUTFLOW");
    amountChanged = false;
    dateChanged = false;
    res.render('summary', {summary, dateDesc, amountDesc});
})

app.get('/report', isLoggedIn, async (req, res) => {
    const user_id = req.user._id;
    let months = (yyyy - 2021) * 12 + 3 + Number(mm);
    let m = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    let arr = [];
    for (let i = 0; i < months; i++)
    {
        arr.push([m[(9 + i) % 12] + " " + toFixed(2020 + ((i + 9) / 12), 0)]);
        //arr[i].push(toFixed(2020 + ((i + 9) / 12), 0));
        // arr[i].push(((10 + i) % 12));
        let totalSpent = 0, sum = 0;
        for(let category of outflowCategories)
        {
            let test  = await finance.find({author: user_id, year: toFixed(2020 + ((i + 9) / 12), 0), month: ((9 + i) % 12) + 1, category: category, outflow: true});
            sum = 0;
            for (let t of test)
            {   
                sum += t.amount;
            }
            totalSpent += sum;
            arr[i].push("$" + toFixed(sum, 2));
        }
        arr[i].push("$" + toFixed(totalSpent, 2));
        let income = await finance.find({author: user_id, year: toFixed(2020 + ((i + 9) / 12), 0), month: ((9 + i) % 12) + 1, outflow: false})
        sum = 0
        for (let i of income)
        {
            sum += i.amount;
        }
        arr[i].push("$" + toFixed(sum, 2));
        arr[i].push("$" + toFixed(sum - totalSpent, 2));
        if (sum - totalSpent <= 0)
        {
            arr[i].push("NA")
        }
        else
        {
            arr[i].push(toFixed((sum - totalSpent) / sum * 100, 2) + "%");
        }
    }
    //console.log(arr);
    arr = arr.reverse();
    res.render('report', {outflowCategories, arr});
})

app.post('/logout', (req,res) => {
    //req.session.user_id = null;
    req.session.destroy();
    res.redirect('/');
})

app.post('/summarydate', isLoggedIn, async (req, res) => {
    //console.log(req.body.dropdown);
    if (req.body.summarydate === "down")
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
    res.redirect('/summary');
})

app.post('/summaryamount', isLoggedIn, async (req, res) => {
    if (req.body.summaryamount === "down")
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
    res.redirect('/summary');
})

app.get('/outflow', isLoggedIn, async (req, res) => {
    res.render('outflow', {outflowCategories, today});
})
app.get('/inflow', isLoggedIn, async (req, res) => {
    res.render('inflow', {inflowCategories, today});
})
app.post('/newOutflow', isLoggedIn, async (req,res) => {
    const newEntry = new finance(changeData(req, true));
    newEntry.author = req.user._id;
    await newEntry.save();
    console.log(newEntry)
    res.redirect("/summary");
})
app.post('/newInflow', isLoggedIn, async (req,res) => {
    const newEntry = new finance(changeData(req, false));
    newEntry.author = req.user._id;
    await newEntry.save();
    console.log(newEntry)
    res.redirect("/summary");
})

app.get('/summary/:id/edit', isLoggedIn, async (req,res) => {
    const { id } = req.params;
    const entry = await finance.findById(id).populate('author');
    // console.log(entry.author._id.toString());
    console.log(entry);
    if (entry.author._id.toString() !== req.user._id)
    {
        return res.redirect('/summary');    
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

app.post('/summary/:id', isLoggedIn, async (req,res) => {
    const { id } = req.params;
    const entry = await finance.findByIdAndUpdate(id, changeData(req), {runValidators: true, new: true})
    res.redirect('/summary');
})

app.delete('/summary/:id', isLoggedIn, async (req,res) => {
    const { id } = req.params;
    console.log('deleted');
    const deleted = await finance.findByIdAndDelete(id);
    res.redirect('/summary');
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`APP IS LISTENING ON PORT ${port}`)
}) 