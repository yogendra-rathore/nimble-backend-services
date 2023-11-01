const express = require('express');
const ErrorHandler = require('./utils/ErrorHandler');
const app=express();
const cookieParser = require('cookie-parser');
const bodyParser=require('body-parser');
const user=require("./controller/user");
const seller=require("./controller/seller");
require("dotenv").config();
const cors = require('cors');
const product = require('./controller/product');
const payment = require('./controller/payment');
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cookieParser());
app.use(cors());
// for making uploads folder availabe globally
app.use("/",express.static("uploads"));
app.use(bodyParser.urlencoded({extended:true}));



// config
if(process.env.NODE_ENV!=="PRODUCTION"){
    require("dotenv").config({
        path:"backend/config/.env"
    })
}

// import routes
app.use("/api/v1/user",user);
app.use("/api/v1/seller",seller);
app.use("/api/v1/product",product);
app.use("/payment",payment);


// Error Handler
app.use(ErrorHandler);

module.exports= app;