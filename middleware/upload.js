const multer = require("multer");

const storage = multer.memoryStorage();

const allowedTypes = [

    "image/jpeg",

    "image/png",

    "image/webp",

    "image/gif",

    "application/pdf"

];

const fileFilter = (

    req,

    file,

    cb

)=>{

    if(

        allowedTypes.includes(

            file.mimetype

        )

    ){

        cb(null,true);

    }else{

        cb(

            new Error(

                "Only JPG, PNG, WEBP, GIF and PDF files are allowed."

            ),

            false

        );

    }

};

const upload = multer({

    storage,

    limits:{

        fileSize:5*1024*1024

    },

    fileFilter

});

module.exports = upload;