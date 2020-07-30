require('dotenv').config();
const express = require('express');
const cheerio = require('cheerio');
const request = require('request');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const app = express()
const mongoose = require('mongoose');
const Stock = require('./models/stock')
mongoose.connect(process.env.DATABASE_URL,{useNewUrlParser:true});
const db = mongoose.connection;
db.on('error',error => console.log(error));
db.once('open',()=>console.log("connected to moongoose"));
app.use(require("body-parser").json())
app.use(express.urlencoded({extended:false}))
app.set('view-engine','ejs')
app.use(express.static('public'))
var counter=0;

app.get('/',async (req,res)=>{
    console.log("/ route")    
    let searchOptions = {}
    const stocks = await Stock.find(searchOptions);
    console.log(stocks);
    res.render('index.ejs',{items: stocks });
    counter = 0;
})
app.post('/new',async (req,res)=>{   
    const stock = new Stock({
        stockId:req.body.stockId,
        lowerLimit:req.body.lowerLimit,
        upperLimit:req.body.upperLimit,
        buyPrice:req.body.buyPrice,
        amountInvested:req.body.amountInvested
    });
    const newStock = await stock.save();   
    console.log(newStock);
    main(newStock.stockId,res,newStock,callback,1);   

}) 
// app.get('/update',async(req,res)=>{
//     console.log("update request recieved");
//     counter = 0;
//     let searchOptions = {}
//     const stocks = await Stock.find(searchOptions);
//     for(var i=0;i<stocks.length;i++){
//         if(i== (stocks.length -1) )
//             main(stocks[i].stockId,res,stocks[i],callback2,0);   
//         else
//             main(stocks[i].stockId,res,stocks[i],callback2,0); 
//     }      
// })
app.post('/change',async(req,res)=>{
    console.log("change post request");
    console.log(req.body);
    var searchOptions = {"stockId":req.body.stockId};
    let stockToBeUpdated = await Stock.find(searchOptions);
    stockToBeUpdated = stockToBeUpdated[0];
    stockToBeUpdated.lowerLimit=req.body.lowerLimit;
    stockToBeUpdated.upperLimit=req.body.upperLimit;
    await stockToBeUpdated.save();
    res.redirect('/');
})
app.post('/delete',async(req,res)=>{
    console.log("delete post request");
    console.log(req.body);
    var searchOptions = {"stockId":req.body.stockId};
    let stockToBeDeleted = await Stock.find(searchOptions);
    stockToBeDeleted = stockToBeDeleted[0];
    await stockToBeDeleted.remove();
    res.redirect('/');   
})
app.listen(4001,()=>console.log('listening on 4001'))

function getCurrentPrice(stockId) {
    console.log("check price")
    var price;
    return new Promise(function(resolve,reject){
        request({
            method: 'GET',
            url: 'https://in.finance.yahoo.com/quote/'+stockId
        }, (err, res, body) => {
            if (err) return reject("jlklklk");
            let $ = cheerio.load(body);
            price = $("span[class='Trsdu(0.3s) Fw(b) Fz(36px) Mb(-4px) D(ib)']").html();      
            resolve(price);
            });
    });
}
async function main(stockId,res,newStock,callback,flag2){
    // var price = await getCurrentPrice(stockId);
    console.log("main function called");
    var price;
    await getCurrentPrice(stockId).then(function(response){
        price = response;
    },function(error) {
        console.error("Failed!", error);
    })
    price=price.replace(/,/g, "");
    console.log(price);
    newStock["currentPrice"]=price
    
    var searchOptions = {"stockId":newStock.stockId};
    let stockToBeUpdated = await Stock.find(searchOptions);
    stockToBeUpdated = stockToBeUpdated[0];
    console.log(stockToBeUpdated._id);
    console.log("stocktoBeUpdated:"+stockToBeUpdated);
    stockToBeUpdated.currentPrice = newStock.currentPrice;        
    stockToBeUpdated.save();    
    
    console.log(newStock["currentPrice"]+newStock["lowerLimit"]+newStock["upperLimit"])
    if(parseFloat(newStock["currentPrice"])>parseFloat(newStock["upperLimit"]))
        sendEmailTesting(newStock["stockId"]+"has crossed upper limit");
    else if(parseFloat(newStock["currentPrice"])<parseFloat(newStock["lowerLimit"]))
        sendEmailTesting(newStock["stockId"]+"has crossed lower limit");
    if(flag2 == 1)
        callback(res)
}
function callback(res){ // not needed as we added to database on /new route itself
   res.redirect('/');
}

function sendEmailTesting(message){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'more.practice1234@gmail.com',
          pass:  ''
        }
      });      
      var mailOptions = {
        from: '"Stock Alert" <more.practice1234@gmail.com>',
        to: 'atharva.sarage@gmail.com',
        subject: message,
        text: 'That was easy!'
      };      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      }); 
}

async function PriceCheckBackgroundTask(){
    console.log("cron job started at : "+new Date());
    let searchOptions = {}
    const stocks = await Stock.find(searchOptions);
    for(var i=0;i<stocks.length;i++){
        main(stocks[i].stockId,null,stocks[i],null,0);   
    }       
}
cron.schedule("*/30 * * * * *",async () => {
    await PriceCheckBackgroundTask(); 
}) 