const express = require("express");
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const {sendMailWithFiles} = require("../utils/sendMail");
const { createOrder } = require("../utils/notificationHelper");

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function generatePDF(items) {
  console.log("Inside receipt generation");
  const doc = new PDFDocument();
  const buffers = [];

  // Pipe the PDF content to buffers
  doc.on('data', (chunk) => buffers.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(buffers);
    fs.writeFileSync('receipt.pdf', pdfBuffer);
  });

  doc.fontSize(20).font('Helvetica-Bold').text('Receipt', { align: 'center' }).moveDown(0.5);
  doc.font('Helvetica').fontSize(12);

  items.forEach((item) => {
    doc.fontSize(16).text(`Item: ${item.name}`);
    doc.fontSize(14).text(`Quantity: ${item.qty}`);
    doc.fontSize(14).text(`Price: CAD${item.originalPrice.toFixed(2)}`).moveDown(0.5);
  });

  const total = items.reduce((acc, item) => acc + item.originalPrice*item.qty, 0);
  doc.fontSize(18).text(`Total: CAD${total.toFixed(2)}`, { align: 'right' });
  const currentY = doc.y;

  // Add Footer
  const footerText1 = 'Thank you for your purchase!';
  const footerText2 = 'Regards,\nTEAM NIMBLE';
  
  const combinedFooterText = `${footerText1}\n${footerText2}`;
  
  // doc.fontSize(12).text(combinedFooterText, { align: 'center', marginBottom: 10 });
  const footerHeight = doc.heightOfString(combinedFooterText, { width: doc.page.width, align: 'center' });
const footerY = doc.page.height - footerHeight - 60; // Adjust 10 for margin

// Set the y position to the calculated footer position
doc.y = footerY;

// Add Footer
doc.fontSize(12).text(combinedFooterText, { align: 'center' });

  


  doc.end();
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

    // await generatePDF(cart);

    try {
      // await sendMailWithFiles({
      //   email: user.email,
      //   subject: "Purchase Invoice",
      //   message: `Hello ${userEmailName},\nThank you for shopping with Nimble! Here is your recent purchase invoice.\nBest Regards,\nNimble Support Team`,
      //   filePath: 'receipt.pdf'
      // });

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

      const userSpecificOrderCreatedObj=await createOrder(mockReq,(err) => {
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
