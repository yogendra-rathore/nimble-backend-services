const mongoose = require('mongoose');
const connectToDatabse=()=>{
    mongoose.connect(process.env.MONGODB_URL,{
        useNewUrlParser:true,
        useUnifiedTopology:true,

    }).then((data)=>{
        console.log(`MongoDB Connected with server ${data.connection.host}`);
    })
}

module.exports=connectToDatabse;