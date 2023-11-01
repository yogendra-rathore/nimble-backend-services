const express = require("express");
const router = express.Router();

// const Stripe = require('stripe');
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY);


router.post("/", async (req, res) => {
  try {
    console.log("Call reached to backend",req.body);
    console.log("current secret",process.env.STRIPE_SECRET_KEY);
    const {amount}=req.body;
    const paymentIntent=await stripe.paymentIntents.create({
        amount:amount,
        currency:'SEK',
        payment_method_types:['card']   
    },
    {
      apiKey: process.env.STRIPE_SECRET_KEY
    }
    )
    const clientSecret=paymentIntent.client_secret;
    console.log("Client secret backend",clientSecret);
    res.json({
      clientSecret
    })
  } catch (error) {
    console.log("Error ",error);
  }
});

  module.exports = router;  
