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
  const logoWidth = 100; // Adjust as needed
  const logoHeight = 50; // Adjust as needed
  const logoBuffer = fs.readFileSync(path.join(__dirname, '../assets/invoiceLogo.png'));
  doc.image(logoBuffer, (doc.page.width - logoWidth) / 2, 20, { width: logoWidth, height: logoHeight });

  // Add Title
  doc.moveDown(2)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Thank You for Your Order!', { align: 'center' })
    .moveDown(0.5);

  // Add Email and Order Info
  doc.fontSize(12)
    .font('Helvetica')
    .text(`Hello ${email},`, { align: 'center' })
    .text('Thank you for shopping with Nimble! Here is your purchase receipt.', { align: 'center' })
    .moveDown(0.5)
    .text(`Order #${orderNumber}`, { align: 'center' })
    .text(date, { align: 'center' })
    .moveDown(1);

  // Add Table Header
  const startX = 50;
  const startY = doc.y;
  const colWidths = [250, 100, 100];
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Item', startX, startY, { width: colWidths[0] });
  doc.text('Quantity', startX + colWidths[0], startY, { width: colWidths[1], align: 'right' });
  doc.text('Price', startX + colWidths[0] + colWidths[1], startY, { width: colWidths[2], align: 'right' });

  doc.moveDown(0.5).font('Helvetica');
  let currentY = doc.y;

  // Add Table Rows
  let subtotal = 0;
  items.forEach((item) => {
    const itemTotal = item.originalPrice * item.qty;
    subtotal += itemTotal;

    doc.text(item.name, startX, currentY, { width: colWidths[0] });
    doc.text(item.qty.toString(), startX + colWidths[0], currentY, { width: colWidths[1], align: 'right' });
    doc.text(`CAD${itemTotal.toFixed(2)}`, startX + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' });

    currentY = doc.y;
  });

  // Add Summary
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax + serviceFee;

  doc.moveDown(1).font('Helvetica-Bold');
  doc.text('Subtotal', startX + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' });
  doc.text(`CAD${subtotal.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[2], align: 'right' });

  currentY = doc.y;
  doc.text(`Tax (${taxRate}%)`, startX + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' });
  doc.text(`CAD${tax.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[2], align: 'right' });

  currentY = doc.y;
  doc.text('Service Fee', startX + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' });
  doc.text(`CAD${serviceFee.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[2], align: 'right' });

  currentY = doc.y;
  doc.text('Total', startX + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' });
  doc.text(`CAD${total.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[2], align: 'right' });

  // Add Footer
  doc.moveDown(2).font('Helvetica').fontSize(10).text('Questions about your order? Contact our support team.', { align: 'center' });
  doc.text('© 2024 Nimble Technologies Inc. This is an automated email, please do not reply.', { align: 'center' });
  doc.text('Terms of Service • Privacy Policy', { align: 'center' });

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
        Order #${orderNumberCustom} \n
        Store: Starbank Market \n
        Pickup Time: ${selectedCollectionTime} \n
        This is an automated message.`,
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
