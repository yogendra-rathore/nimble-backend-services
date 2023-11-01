const app=require("./app");
const connectToDatabse = require("./db/dbConfig");


// Exception Handling
process.on("uncaughtException",(err)=>{
    console.log(`Error: ${err.message} `);
    console.log("Shutting Down the server for handling");
});

if(process.env.NODE_ENV!=="PRODUCTION"){
    require("dotenv").config({
        path:"backend/config/.env"
    })
}

// Connect to DB
connectToDatabse();

const server=app.listen(process.env.PORT,()=>{
    console.log(`Server is up and running http://localhost:${process.env.PORT}`);
})

process.on("unhandledRejection",(err)=>{
    console.log(`Error: ${err.message} `);
    console.log("Shutting Down the server for handling unhandledRejection");
    server.close(()=>{
        process.exit(1);
    })
});

