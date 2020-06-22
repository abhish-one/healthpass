const { admin, db } = require("../util/admin");
const config = require("../util/config");
const { uuid } = require("uuidv4");

const firebase = require("firebase");
const { report } = require("process");
firebase.initializeApp(config);


// Sign users up
exports.signup = (req, res) => {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      userName: req.body.userName,
    };
    //const { valid, errors } = validateSignupData(newUser);
  
    //if (!valid) return res.status(400).json(errors);
  
    let token, userId ; 
    db.doc(`/users/${newUser.userName}`).get()
      .then(doc => {
        if(doc.exists){
          return res.status(400).json({userName : 'this Username is already taken'});
        } else {
           return firebase.auth()
          .createUserWithEmailAndPassword(newUser.email,newUser.password)
        }  
    })
      .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken()
          
      })
      .then(idToken => {
        token = idToken;
        const userCredentials = {
          userName : newUser.userName,
          email : newUser.email,
          createdAt : new Date().toISOString(),
          userId,
        };
        return db.doc(`/users/${newUser.userName}`).set(userCredentials);
      })
      .then(() => {
        return res.status(201).json({ token });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === "auth/email-already-in-use") {
          return res.status(400).json({ email: "Email is already is use" });
        } else {
          return res
            .status(500)
            .json({ general: "Something went wrong, please try again" });
        }
      });
      
    };

//Get details of Patient's labreports

exports.getPatientReport = (req,res) => {
    let reportData = {};
    let sfRef = db.collection(`users`).doc(`${req.user.userName}`);
    sfRef.collection('labreports').get()
    .then((data1) => {
        reportData.info = [];
        data1.forEach((doc) => {
            reportData.info.push({
                reportId : doc.id,
                imageUrl : doc.data().imageUrl,
                createdAt : doc.data().createdAt
            });

        })
        return res.json(reportData);
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
        
   
  };


  //login patient

  exports.login = (req, res) => {
    const user = {
      email: req.body.email,
      password: req.body.password,
    };
  
    //const { valid, errors } = validateLoginData(user);
  
    //if (!valid) return res.status(400).json(errors);
  
    firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password)
      .then((data) => {
        return data.user.getIdToken();
      })
      .then((token) => {
        return res.json({ token });
      })
      .catch((err) => {
        console.error(err);
        // auth/wrong-password
        // auth/user-not-user
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      });
  };
    
  // Upload labreport images for a patients
exports.uploadLabReport = (req, res) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");
  
    const busboy = new BusBoy({ headers: req.headers });
  
    let imageToBeUploaded = {};
    let imageFileName;
    // String for image token
    let generatedToken = uuid();
  
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, file, filename, encoding, mimetype);
      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        return res.status(400).json({ error: "Wrong file type submitted" });
      }
      // my.image.png => ['my', 'image', 'png']
      const imageExtension = filename.split(".")[filename.split(".").length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on("finish", () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
              //Generate token to be appended to imageUrl
              firebaseStorageDownloadTokens: generatedToken,
            },
          },
        })
        .then(() => {
          // Append token to url
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;

          let data = {
              imageUrl : imageUrl,
              createdAt : new Date().toISOString(),

          }
          //db.doc(`/users/${req.user.handle}`).get()
          let labref = db.collection(`users`).doc(`${req.user.userName}`);
          let lb = labref.collection('labreports');
          let reprotname = 'report'+`${Math.round(Math.random()*10000)}`
          lb.doc(reprotname).set(data);
         
            })
            .then(() => {
                return res.json({ message: "image uploaded successfully" });
              })
              .catch((err) => {
                console.error(err);
                return res.status(500).json({ error: "something went wrong" });
              });
      
   
  });
  busboy.end(req.rawBody);
};