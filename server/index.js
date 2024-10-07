const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require('multer');
require("dotenv").config();
const axios = require("axios")
const path = require('path');
const User=require('./Model/User.js')
const mongoose=require('mongoose')
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors({
  origin: ["http://localhost:3000","https://play.google.com/log"],
  credentials: true,
  methods: ["GET", "POST", "PUT"]
}));

app.use('/uploads', express.static('uploads'));

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/interIIT') 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});

const upload = multer({ storage });

async function generate(question, mediaPath) {
  const fileManager = new GoogleAIFileManager(process.env.API_KEY);

  const uploadResult = await fileManager.uploadFile(
    `${mediaPath}`,
    {
      mimeType: "image/jpeg",
      displayName: " ",
    },
  );


  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([
    question,
    {
      fileData: {
        fileUri: uploadResult.file.uri,
        mimeType: uploadResult.file.mimeType,
      },
    },
  ]);
 return result.response.text()
}

async function askquestion(question){
 const response = await axios({
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${
      process.env.API_KEY
    }`,
    method: "post",
    data: {

        "contents": [{
          "parts": [
            { "text": question }

          ]
        }]


    },
  });

  return response["data"]["candidates"][0]["content"]["parts"][0]["text"]
}

app.post("/chat",upload.single('image'), async (req, res) => {
  try {
    const { question } = req.body
    let relativePath='';
    if(req.file){
       relativePath = `./${req.file.path}`;
    }

    let result = relativePath?await generate(question, relativePath ):await askquestion(question) ;
    
    res.status(200).json({
      status: true,
      answer: result
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      status: false,
      message: "An unknown error occurred"
    })
  }
});

app.post('/signin',async(req,res)=>{
  try {

    let { email} = req.body;
    
    let findemail = await User.findOne({ email: email });

    if (!findemail) {
        let result = await User.create({ email: email})
    }
    let token = jwt.sign({email}, process.env.JWT_SECRET_KEY)
  
    res.json({ message: "Signed Up sucessfully", status: true,token:token })

} catch (error) {
    res.json({ message: "Error in Sign Up",status:false})
}
})


// GET endpoint to handle chat
app.get("/stream", async (req, res) => {
  // TODO: Stream the response back to the client
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
