// Node.js program to demonstrate
// the fs.readFile() method
  
// Include fs module
var fs = require('fs');
const mongoose = require('mongoose');
const finance = require('./models/finance');
//console.log('readFile called');
mongoose.connect('mongodb://localhost:27017/finance', { useNewUrlParser: true, useUnifiedTopology: true})
.then (() => {
    console.log('MONGO CONNECTION OPEN!!')
})
.catch(err => {
    console.log('MONGO CONNECTION ERROR!!');
    console.log(err);
})
  
// Use fs.readFile() method to read the file
console.log("hi");
fs.readFile('book1.csv', 'utf8', function(err, data){
      
    // Display the file content
    //console.log(data);

let i = 0;
while (data[i] !== "\n") 
{
    i++;
}
while(data[i] !== "#")
{
    let notes = "", amount = "", day = "", month = "", year = "", category = "";
    while(data[i] !== ",")
    {
        notes += data[i]
        i++;
    }
    i++;
    while(data[i] !== ",")
    {
        amount += data[i]
        i++;
    }
    i++;
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
    while(data[i] !== "\n")
    {
        if (data[i] === '\r')
        {
            break;
        }
        if (data[i] === "#"){
            break;
        }
        //console.log(data[i])
        category += data[i]
        i++;
    }
    let seedFinance =
        {
            outflow: false,
            day: day,
            month: month,
            year: year,
            amount: amount,
            category: category,
            notes: notes.substring(1),
            author: "634225ceced75245a2ce6728"
        };
    const seedDB = async () => {
        //await finance.deleteMany({})
        await finance.insertMany(seedFinance)
        .then(res => {
            console.log(res);
        })
        .catch(e => {
            console.log(e);
        })
    }
    seedDB();
    console.log(seedFinance);
    if (data[i] === "#"){
        break;
    }
    i++;
}
//console.log(year);

});