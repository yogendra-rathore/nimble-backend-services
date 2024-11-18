const express = require("express");
const router = express.Router();
const PDFDocument = require('pdfkit');
const {sendMailWithFiles} = require("../utils/sendMail");
const { createOrder } = require("../utils/notificationHelper");
const crypto = require('crypto'); // For hashing
const path = require('path');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function generatePDF(items,userName,orderNumberCustom) {
  console.log("Inside receipt generation");
  const metadata={
    orderNumber: orderNumberCustom,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    email: userName,
    taxRate:13,
    serviceFee:2



  }
  const { orderNumber, date, email, taxRate, serviceFee } = metadata;

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];

  doc.on('data', (chunk) => buffers.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(buffers);
    fs.writeFileSync('invoice.pdf', pdfBuffer);
  });

  // Add the logo
  const logoWidth = 50; // Adjust as needed
  const logoHeight = 50; // Adjust as needed
  const logoBuffer = fs.readFileSync(path.join(__dirname, '../assets/invoiceLogo.png'));
  doc.image(logoBuffer, (doc.page.width - logoWidth) / 2, 20, { width: logoWidth, height: logoHeight }).moveDown(2.5);

 // Title
 doc.fontSize(16)
 .font('Helvetica-Bold')
 .text('Thank You for Your Order!', { align: 'center' })
 .moveDown(0.5);

// Email and Welcome Message
doc.fontSize(11)
 .font('Helvetica')
 .text(`Hello ${email},`, { align: 'center', color: '#666666' })
 .text('Thank you for shopping with Nimble! Here is your purchase', { align: 'center', color: '#666666' })
 .text('receipt.', { align: 'center', color: '#666666' })
 .moveDown(0.5);

// Order Number and Date
doc.text(`Order #${orderNumber}`, { align: 'center', color: '#666666' })
 .text(date, { align: 'center', color: '#666666' })
 .moveDown(1);

// Items
const startX = 50;
let currentY = doc.y;
const colWidth = doc.page.width - 100; // Total width minus margins

items.forEach((item) => {
 // Item name
 doc.font('Helvetica-Bold')
    .fontSize(11)
    .text(item.name, startX, currentY, { continued: true });

 // Price (right-aligned)
 doc.text(`CAD ${(item.originalPrice * item.qty).toFixed(2)}`, { align: 'right' });

 // Quantity (on next line)
 currentY = doc.y;
 doc.font('Helvetica')
    .fontSize(10)
    .text(`Quantity: ${item.qty}`, startX, currentY, { color: '#666666' });

 currentY = doc.y + 10;
 doc.y = currentY;
});

// Calculate totals
const subtotal = items.reduce((sum, item) => sum + (item.originalPrice * item.qty), 0);
const tax = subtotal * (taxRate / 100);
const total = subtotal + tax + serviceFee;

// Summary section
doc.moveDown(1);
currentY = doc.y;

// Subtotal
doc.font('Helvetica-Bold')
  .fontSize(11)
  .text('Subtotal', startX, currentY, { continued: true })
  .text(`CAD ${subtotal.toFixed(2)}`, { align: 'right' });

// Tax
currentY = doc.y;
doc.text(`Tax (${taxRate}%)`, startX, currentY, { continued: true }).font('Helvetica-Bold')
  .text(`CAD ${tax.toFixed(2)}`, { align: 'right' });

// Service Fee
currentY = doc.y;
doc.text('Service Fee', startX, currentY, { continued: true }).font('Helvetica-Bold')
  .text(`CAD ${serviceFee.toFixed(2)}`, { align: 'right' });

// Total
currentY = doc.y;
doc.text('Total', startX, currentY, { continued: true }).font('Helvetica-Bold')
  .text(`CAD ${total.toFixed(2)}`, { align: 'right' });

// Footer
doc.moveDown(2)
  .font('Helvetica')
  .fontSize(10)
  .text('Questions about your order? Contact our support team.', { align: 'center', color: '#666666' })
  .moveDown(0.5)
  .fontSize(9)
  .text('© 2024 Nimble Technologies Inc.', { align: 'center', color: '#666666' })
  .text('This is an automated email, please do not reply.', { align: 'center', color: '#666666' })
  .text('Terms of Service • Privacy Policy', { align: 'center', color: '#666666' });

doc.end();
}

function getCurrentDate() {
  const now = new Date(); // Get the current date
  const year = now.getFullYear(); // Get the year
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Get the month (0-based, so add 1) and pad with leading zero
  const day = String(now.getDate()).padStart(2, '0'); // Get the day and pad with leading zero
  return `${year}-${month}-${day}`; // Combine into the desired format
}

function generateOrderId(email, orderDate) {
  // Extract the year from the order date
  const year = new Date(orderDate).getFullYear();

  // Create a hash of the email (using the first 8 characters for uniqueness)
  const emailHash = crypto.createHash('md5').update(email).digest('hex').slice(0, 8).toUpperCase();

  // Combine to form the unique order ID
  return `${emailHash}`;
}

function generateOrderNumber(orderDate, orderId) {
  const year = new Date(orderDate).getFullYear(); // Extract year from the provided date
  const paddedOrderId = String(orderId).padStart(4, '0'); // Pad the order ID to 4 digits
  return `NIM-${year}-${paddedOrderId}`;
}

router.post("/", async (req, res) => {
  try {
    console.log("Call reached to backend", req.body);
    console.log("current secret", process.env.STRIPE_SECRET_KEY);
    const { amount,currency} = req.body;
    console.log("Data received in payment route---->", amount);
    

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: `${currency}`,
      payment_method_types: ['card'],
    },
    {
      apiKey: process.env.STRIPE_SECRET_KEY
    }
    
    );

    const clientSecret = paymentIntent.client_secret;
    console.log("Client secret backend", clientSecret);
    res.json({
      clientSecret,
    });
  } catch (error) {
    console.log("Error ", error);
    res.status(500).json({
      error: 'Internal Server Error',
    });
  }
});

router.post("/postPayment", async (req, res) => {
  try {
    console.log("Call reached backend", req.body);
    console.log("current secret", process.env.STRIPE_SECRET_KEY);

    const { user, cart, shippingAddress, totalPrice, paymentInfo, selectedCollectionTime, isPremium } = req.body;
    console.log("Data received in payment route---->", user, cart);

    let userName = user.email.split(".")[0];
    let userEmailName = userName.charAt(0).toUpperCase() + userName.slice(1);
    let generatedOrderId=await generateOrderId(user.email,getCurrentDate());
    let orderNumberCustom=await generateOrderNumber(getCurrentDate(),generatedOrderId);

    await generatePDF(cart,userEmailName,orderNumberCustom);

    try {
      await sendMailWithFiles({
        email: user.email,
        subject: `Your Nimble Receipt - Starbank Market Pickup - Order #${orderNumberCustom}`,
        message: `Hello ${userEmailName},\nThanks for using Nimble Curbside Pickup at Fulton Market! Your digital receipt for today's pickup is attached below.
        \nWe hope your pickup experience was smooth. Next time, try our in-store snap & go feature to skip the waiting entirely.
        \n Questions? Our team is here at help@nimble.com \n
        \n Happy shopping! \n
        \n The Nimble Team \n
        \n --------------- \n
        \n Order #${orderNumberCustom} \n
        \n Store: Starbank Market \n
        \n Pickup Time: ${selectedCollectionTime} \n
        \n This is an automated message.`,
        filePath: 'invoice.pdf'
      });

      const mockReq = {
        body: {
          cart,
          shippingAddress,
          user,
          totalPrice,
          paymentInfo,
          selectedCollectionTime,
          isPremium,
        }
      };

      // const mockRes = {
      //   status: (statusCode) => ({
      //     json: (response) => {
      //       console.log('Order creation response:', response);
      //     },
      //   }),
      // };

      // await createOrder(mockReq, mockRes, (err) => {
      //   if (err) {
      //     console.log('Error during order creation:', err);
      //     return res.status(500).json({
      //       error: 'Error during order creation',
      //     });
      //   }
      // });

      const userSpecificOrderCreatedObj = await createOrder(mockReq, (err) => {
        if (err) {
          console.log('Error during order creation:', err);
          return res.status(500).json({
            error: 'Error during order creation',
          });
        }
      });

      res.status(200).json({
        success: true,
        userSpecificOrderCreatedObj,
        message: `Please check your email: ${user.email} for the invoice`,
      });

    } catch (error) {
      console.log("Error sending email or creating order", error);
      res.status(500).json({
        error: 'Internal Server Error',
      });
    }

  } catch (error) {
    console.log("Error in payment processing", error);
    res.status(500).json({
      error: 'Internal Server Error',
    });
  }
});


module.exports = router;
