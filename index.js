const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require("cors");
var jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const stripe = require("stripe")(process.env.PAYMENT_SECRETKEY)
const port = process.env.PORT || 8000;



// Middleware
app.use(cors());
app.use(express.json());
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: "unthorized 1 user"})
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: "unthorized 2 user"})
    }
    req.decoded = decoded;
    next()
  })
}

// Routes
// Define your routes here
app.get('/', (req, res) => {
    res.send("Summer Camp in running on Load Sheading hire")
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lmw0s1b.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const usersCollection = client.db("summer-camp").collection("users");
    const classCollection = client.db("summer-camp").collection("classes");
    const selectedClassesCollection = client.db("summer-camp").collection("selectedClass");
    const instructorCollection = client.db("summer-camp").collection("instructors");
    const paymentCollection = client.db("summer-camp").collection("paymentCollection");
    const enrolledClassesCollection = client.db("summer-camp").collection("enrolledClasses");


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: '10h' });
      res.send({token})
    })


    app.get('/users', verifyJWT, async(req, res) => {
      const email = req.query.email;
      // if(email !== req.decoded.email){
      //   return res.send({error: true, message: "unathorized user"})
      // }
      const result = await usersCollection.find().toArray();
      res.send(result)
    })
    app.post("/users", async(req, res) => {
      const user = req.body;
      const query = {email: user.email}
      const existist = await usersCollection.findOne(query);
      if(existist){
        return res.send({error: true, message: "User already added in Collection"})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    app.get('/userrole', async(req, res) => {
      const email = req.query.email;
      const query = { email: email};
      const user = await usersCollection.findOne(query);
      res.send({role: user?.role})
    })


    app.patch('/userrole/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;
      const {role} = req.body;
      const filter = {email: email};
      console.log(email, role);
      const updateDoc = {
        $set: {
          role: role
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.get('/classes', async(req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    app.get('/selectedClasses/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await selectedClassesCollection.findOne(query);
      res.send(result)
    })
    app.get('/classes/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await classCollection.findOne(query);
      res.send(result)
    })

    app.get('/approvedclasses', async(req, res) => {
      // console.log(req.headers.authorization);
      const filter = {status: "approved"}
      const result = await classCollection.find(filter).toArray();
      res.send(result)
    })

  

    app.get('/instructorClasses', verifyJWT, async(req, res) => {
      const email = req.query.email;
      const query = {instructor_email: email};
      const result = await classCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/classes', verifyJWT, async(req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result)
    })

    app.patch("/classes/setapprove/:id", verifyJWT, async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      console.log(id);
      const updateDoc = {
        $set: {
          status: "approved"
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    app.patch("/classes/setdeny/:id", verifyJWT, async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      console.log(id);
      const updateDoc = {
        $set: {
          status: "denied"
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/classes/feedback/:id', verifyJWT, async(req, res) => {
      const id = req.params.id;
      const {feedback} = req.body;
      console.log(feedback);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedback
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    app.get('/popularclasses', async(req, res) => {
      const sort = {total_students: -1}
      const result = await classCollection.find().sort(sort).limit(6).toArray();
      res.send(result)
    })

    app.get('/selectedclasses', verifyJWT, async(req, res) => {
      const email = req.query.email;
      const query = {addedBy: email};
      const result = await selectedClassesCollection.find(query).toArray();
      res.send(result)
    })
    app.get('/enrolledclasses/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = {enrolledBy: email};
      const result = await enrolledClassesCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/enrolledclasses', verifyJWT, async(req, res) => {
      const classToEnroll = req.body;
      console.log(classToEnroll);
      const result = await enrolledClassesCollection.insertOne(classToEnroll);
      res.send(result)
    })

    app.post('/selectedclasses', verifyJWT, async(req, res) => {
      const selectedClass = req.body;
      console.log(selectedClass);
      const result = await selectedClassesCollection.insertOne(selectedClass);
      res.send(result)
    })

    app.delete("/selectedclasses", verifyJWT, async(req, res) => {
      const id = req.query.id;
      const query = {_id: new ObjectId(id)};
      const result = await selectedClassesCollection.deleteOne(query);
      res.send(result)
    })

    // Payment Related Api

    app.post('/create-payment-intent', verifyJWT, async(req, res) => {
      const {classPrice} = req.body;
      const amount = classPrice * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ["card"]
      })

      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })


    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const id = req.body.classid;
      console.log(req.body);
      const query = {_id: new ObjectId(id)}
      const deleteResult = await selectedClassesCollection.deleteOne(query);
      res.send({result, deleteResult});
    })

    app.get('/payments/:email', async(req, res) => {
      const email = req.params.id;
      const query = {email: email};
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    })

    app.patch('/classes/update/:id', verifyJWT, async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const classToUpdate = await classCollection.findOne(filter);
      const updateDoc = {
        $set: {
          available_seats: classToUpdate.available_seats - 1,
          total_students: classToUpdate.total_students + 1
        }
      }
     
      const result = await classCollection.updateOne(filter, updateDoc);
      
      res.send(result)
    })


    app.get('/instructors', async(req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result)
    })
    
    app.get('/popularinstructors', async(req, res) => {
      const result = await instructorCollection.find().limit(6).toArray();
      res.send(result)
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// Start the server
 // Specify the desired port number
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});





