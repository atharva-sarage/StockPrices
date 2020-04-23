require('dotenv').config();
const express = require('express')
const cheerio = require('cheerio');
const request = require('request');
const nodemailer = require('nodemailer');
const app = express()
app.use(require("body-parser").json())
app.use(express.urlencoded({extended:false}))
var JSONStocks = '{"stocks":[]}' // JSON stocks is a json STRING
app.set('view-engine','ejs')
app.use(express.static('public'))
var counter=0;

function sendEmailTesting(message){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'atharva.sarage@gmail.com',
          pass:  ''// password
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

app.get('/',(req,res)=>{
    console.log(JSONStocks)
    console.log("/ route")        
    res.render('index.ejs',{items: JSON.parse(JSONStocks)});
    counter = 0;
})
app.post('/new',(req,res)=>{   
    var newStock = ({
        "stockId":req.body.stockId,
        "lowerLimit":req.body.lowerLimit,
        "upperLimit":req.body.upperLimit
    })
   main(newStock.stockId,res,-1,newStock,callback,1);   

}) 
app.get('/update',(req,res)=>{
    console.log("update request recieved");
    counter = 0;
    stocks = JSON.parse(JSONStocks)
    for(var i=0;i<stocks["stocks"].length;i++){
        if(i== (stocks["stocks"].length -1) )
            main(stocks["stocks"][i].stockId,res,i,stocks["stocks"][i],callback2,0);   
        else
            main(stocks["stocks"][i].stockId,res,i,stocks["stocks"][i],callback2,0); 
    }      
})
app.post('/change',(req,res)=>{
    console.log("change post request");
    console.log(req.body);
    stocks = JSON.parse(JSONStocks)
    for(var i=0;i<stocks["stocks"].length;i++){
        if(stocks["stocks"][i].stockId === req.body.stockId){
            stocks["stocks"][i].stockId=req.body.stockId;
            stocks["stocks"][i].lowerLimit=req.body.lowerLimit;
            stocks["stocks"][i].upperLimit=req.body.upperLimit;
            JSONStocks = JSON.stringify(stocks);
            res.redirect('/');
            break;
        }            
    }
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
            if (err) return console.error(err);
            let $ = cheerio.load(body);
            price = $("span[class='Trsdu(0.3s) Fw(b) Fz(36px) Mb(-4px) D(ib)']").html();      
            resolve(price);
            });
    });
}
async function main(stockId,res,idx,newStock,callback,flag2){
    var price = await getCurrentPrice(stockId);
    newStock["currentPrice"]=price
    if(idx!=-1){
        stocks=JSON.parse(JSONStocks);
        console.log("newstock");
        console.log(newStock);        
        stocks["stocks"][idx]=newStock;
        console.log(stocks);
        JSONStocks=JSON.stringify(stocks);
        console.log("done")
        console.log(JSONStocks);
    }
    console.log(newStock["currentPrice"]+newStock["lowerLimit"]+newStock["upperLimit"])
    if(parseFloat(newStock["currentPrice"])>parseFloat(newStock["upperLimit"]))
        sendEmailTesting(newStock["stockId"]+"has crossed upper limit");
    else if(parseFloat(newStock["currentPrice"])<parseFloat(newStock["lowerLimit"]))
        sendEmailTesting(newStock["stockId"]+"has crossed lower limit");
    console.log(newStock["currentPrice"])    
    if(flag2 == 1)
        callback(res,newStock)
    else if(flag2 === 0)
        callback2(res)
}
function callback(res,newStock){
    var flag = false;
    stocks = JSON.parse(JSONStocks)
    console.log(stocks["stocks"])
    for(var i=0;i<stocks["stocks"].length;i++){
        if(stocks["stocks"][i].stockId === newStock.stockId)
            flag = true
    }
    if (flag === false)
        stocks["stocks"].push(newStock);
    JSONStocks = JSON.stringify(stocks); // stringify to json string , parse to javascript object     
    res.redirect('/');
}
function callback2(res){
    counter++;
    console.log(counter)
    console.log(JSONStocks)
    stocks = JSON.parse(JSONStocks)
    console.log(stocks);
    if(counter == stocks["stocks"].length){
        JSONStocks = JSON.stringify(stocks); // stringify to json string , parse to javascript object     
        res.redirect('/');
    }
}
