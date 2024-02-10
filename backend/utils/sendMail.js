const nodemailer = require('nodemailer');

const sendMailWithoutFile=async (options)=>{
    const transporter=nodemailer.createTransport({
        host: process.env.SMPT_HOST,
        port:process.env.SMPT_PORT,
        service: process.env.SMPT_SERVICE,
        auth:{
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASSWORD
        }

    });
    const mailOptions={
        from: process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    await transporter.sendMail(mailOptions);
}

const sendMailWithFiles=async (options)=>{
    const transporter=nodemailer.createTransport({
        host: process.env.SMPT_HOST,
        port:process.env.SMPT_PORT,
        service: process.env.SMPT_SERVICE,
        auth:{
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASSWORD
        }

    });
    const mailOptions={
        from: process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message,
        attachments: [
            {
              filename: 'receipt.pdf',
              path: options.filePath,
              encoding: 'base64',
            },
          ]
    }

    await transporter.sendMail(mailOptions);
}

module.exports={
    sendMailWithoutFile,
    sendMailWithFiles,
  };
