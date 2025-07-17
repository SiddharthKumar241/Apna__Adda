require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Models import
const User = require('./models/User');
const Tenant = require('./models/Tenant');
const Listing = require('./models/Listing');
const AuthorityPlots = require('./models/AuthorityPlots');
const FreeholdProperty = require('./models/FreeholdProperty');
const IndustrialPlots = require('./models/IndustrialPlots');
const FlatsApartments = require('./models/FlatsApartments');
const Admin = require('./models/Admin');

// Ensure upload directories exist
const uploadOwnershipDir = path.join(__dirname, 'uploads', 'ownership_papers');
const uploadTenantDir = path.join(__dirname, 'uploads', 'tenant');

if (!fs.existsSync(uploadOwnershipDir)) fs.mkdirSync(uploadOwnershipDir, { recursive: true });
if (!fs.existsSync(uploadTenantDir)) fs.mkdirSync(uploadTenantDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));
// Morgan logging
const morgan = require('morgan');
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// Rate limiting to prevent brute-force login/registration
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  handler: (req, res) => {
    res.status(429).send(`
      <html>
        <head>
          <title>Too Many Requests</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f0f0f0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .message-box {
              background-color: #98c79c;
              color: white;
              padding: 30px 40px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
              width: 90%;
            }
            .message-box h1 {
              margin-bottom: 15px;
              font-size: 2.5rem;
            }
            .message-box p {
              font-size: 1.2rem;
              margin-bottom: 25px;
            }
            .btn-home {
              background-color: white;
              color: #98c79c;
              padding: 12px 25px;
              border-radius: 30px;
              text-decoration: none;
              font-weight: 600;
              font-size: 1rem;
              box-shadow: 0 3px 6px rgba(0,0,0,0.15);
              transition: background-color 0.3s ease, color 0.3s ease;
              display: inline-block;
            }
            .btn-home:hover {
              background-color: #7ca36d;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="message-box">
            <h1>🚫 Too Many Attempts!</h1>
            <p>Please wait <strong>15 minutes</strong> before trying again.<br>Thanks for your patience! 😊</p>
            <a href="/" class="btn-home">Return to Homepage</a>
          </div>
        </body>
      </html>
    `);
  }
});
app.use('/login', authLimiter);
app.use('/register', authLimiter);

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 5 * 60 * 1000 }
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Multer setup for ownership papers (admin)
const ownershipStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadOwnershipDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadOwnership = multer({ storage: ownershipStorage });

// Multer setup for tenant photo upload
const tenantStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadTenantDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadTenant = multer({ storage: tenantStorage });

// ========== Routes ==========
//chatbot route

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: 'Message required, bhai!' });

  const greetings = ['hi', 'hello', 'hola', 'hey', 'namaste', 'good morning', 'good evening', 'kaise ho'];
  if (greetings.some(greet => message.toLowerCase().includes(greet))) {
    return res.json({
      reply: ` Yo, welcome to Apna Adda! 🏡🔥
Main hoon tera AI dost – smart, savage, aur full desi toast! 😎
Flat chahiye, villa ka scene ho ya rental ka dream –
Bas bol kya chahiye, warna kar dun Tera budget meme! 😂

Hindi masti + English swag = perfect jod! 💬
No fake talk, sirf real estate ka solid road. 💪
Tera budget low ho ya sapne high,
Main hoon ready – just type kar bhai! 📲

Soch mat, bol kya plan hai?
Ghar ka jugaad ab hoga AI ke dhan se! 🚀`
    });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
You are Apna Adda's chatty, warm-hearted real estate assistant with a dash of Indian spice.

- ONLY talk about Apna Adda’s house listings, renting features, and related services.
- Listings: Authority Plots, Freehold Properties, Industrial Plots, Flats, Apartments.
- Features: Broker-free rentals, tenant safety, visit scheduling, rent agreements.
- Always be polite, helpful, and sometimes a bit witty.
- Developer credit: Created with ❤️ by Siddharth Kumar.
- If unsure or asked unrelated stuff, politely say:
  "Sorry yaar, I’m here only for Apna Adda’s listings and features. Let’s keep it desi and relevant!"
            `,
          },
          { role: 'user', content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const botReply = response.data.choices[0].message.content.trim();
    res.json({ reply: botReply });
  } catch (error) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    res.status(500).json({ reply: 'Oops! Something went wrong on my side. Try again soon, dost!' });
  }
});

// User register
app.post("/register", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // 10 is the salt rounds
    await User.create({
      Username: req.body.username,
      Email: req.body.email,
      Password: hashedPassword,
    });
    res.redirect("/login.html");
  } catch (err) {
    console.error(err);
    res.redirect("/register_failure.html");  
  }
});
// User login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ Email: email });

    if (!user) {
      return res.redirect("/login_failure.html");
    }

    const match = await bcrypt.compare(password, user.Password);

    if (!match) {
      return res.redirect("/login_failure.html");
    }

    req.session.user = {
      email: user.Email,
      username: user.Username
    };

    res.redirect("/Homepage.html");

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Internal server error during login.");
  }
});


app.get("/session-info", (req, res) => {
  const user = req.session.user;
  res.json({ loggedIn: !!user, username: user?.username || null });
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Logout failed.");
    }
    res.redirect("/Homepage.html");
  });
});

// Listings routes
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await Listing.find();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

app.get('/load-data', async (req, res) => {
  try {
    const count = await Listing.countDocuments();
    if (count > 0) return res.send('Data already exists in DB. No new insert.');
    const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    await Listing.insertMany(data);
    res.send('Data loaded into MongoDB (Apna_Adda -> listings)');
  } catch (err) {
    console.error('Error loading data:', err);
    res.status(500).send('Error loading data: ' + err);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'Homepage.html'));
});

// Category load & fetch routes similar to your existing code
app.get('/load-authority-plots', async (req, res) => {
  try {
    const count = await AuthorityPlots.countDocuments();
    if (count > 0) return res.send('Authority Plots data already loaded.');
    const data = JSON.parse(fs.readFileSync('./authority_plots.json', 'utf8'));
    await AuthorityPlots.insertMany(data);
    res.send('Authority Plots data loaded successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load Authority Plots data.');
  }
});

app.get('/authority-plots', async (req, res) => {
  try {
    const data = await AuthorityPlots.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Authority Plots' });
  }
});

// Load Freehold Property data from JSON file to MongoDB (only if empty)
app.get('/load-freehold-property', async (req, res) => {
  try {
    const count = await FreeholdProperty.countDocuments();
    if (count > 0) return res.send('Freehold Property data already loaded.');

    const data = JSON.parse(fs.readFileSync('./freehold_property.json', 'utf8'));
    await FreeholdProperty.insertMany(data);

    res.send('Freehold Property data loaded successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load Freehold Property data.');
  }
});

// Get all Freehold Properties from MongoDB
app.get('/freehold-property', async (req, res) => {
  try {
    const data = await FreeholdProperty.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Freehold Property data' });
  }
});

// Load Industrial Plots data from JSON file to MongoDB (only if empty)
app.get('/load-industrial-plots', async (req, res) => {
  try {
    const count = await IndustrialPlots.countDocuments();
    if (count > 0) return res.send('Industrial Plots data already loaded.');

    const data = JSON.parse(fs.readFileSync('./industrial_plots.json', 'utf8'));
    await IndustrialPlots.insertMany(data);

    res.send('Industrial Plots data loaded successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load Industrial Plots data.');
  }
});

// Get all Industrial Plots from MongoDB
app.get('/industrial-plots', async (req, res) => {
  try {
    const data = await IndustrialPlots.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Industrial Plots data' });
  }
});

// Load Flats & Apartments data from JSON file to MongoDB (only if empty)
app.get('/load-flats-apartments', async (req, res) => {
  try {
    const count = await FlatsApartments.countDocuments();
    if (count > 0) return res.send('Flats & Apartments data already loaded.');

    const data = JSON.parse(fs.readFileSync('./flats_apartment', 'utf8'));
    await FlatsApartments.insertMany(data);

    res.send('Flats & Apartments data loaded successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load Flats & Apartments data.');
  }
});

// Get all Flats & Apartments from MongoDB
app.get('/flats-apartments', async (req, res) => {
  try {
    const data = await FlatsApartments.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Flats & Apartments data' });
  }
});

const categoryFileMap = {
  freehold: 'freehold.json',
  flats: 'flats.json',
  industrial: 'industrial.json',
  authority: 'authority.json',
  commercial: 'commercial.json'
};

app.post('/add-listing', async (req, res) => {
  try {
    const { city, title, type, rent, area, image, category } = req.body;

    if (!city || !title || !type || !rent || !area || !image || !category) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const filePath = categoryFileMap[category];
    if (!filePath) return res.status(400).json({ message: 'Invalid category.' });

    const absolutePath = path.join(__dirname, filePath);
    let listings = [];

    try {
      const data = await fsPromises.readFile(absolutePath, 'utf8');
      listings = JSON.parse(data);
      if (!Array.isArray(listings)) listings = [];
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; // rethrow if not "file not found"
    }

    listings.push({
      city,
      title,
      type,
      rent,
      dateAdded: new Date().toISOString().split('T')[0],
      area,
      image
    });

    await fsPromises.writeFile(absolutePath, JSON.stringify(listings, null, 2));

    res.status(200).json({ message: 'Listing added successfully!' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Admin routes

app.post('/admin/register', uploadOwnership.single('ownershipPaper'), async (req, res) => {
  try {
    const { name, email, password, aadhaar } = req.body;
    const ownershipPaperFileName = req.file?.filename;

    if (!name || !email || !password || !aadhaar || !ownershipPaperFileName)
      return res.status(400).send('All fields including ownership paper upload are required.');

    if (!/^\d{12}$/.test(aadhaar))
      return res.status(400).send('Invalid Aadhaar number. Must be exactly 12 digits.');

    const existingAdmin = await Admin.findOne({ $or: [{ email }, { aadhaar }] });
    if (existingAdmin)
      return res.status(400).send('Admin with given email or Aadhaar already exists.');

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({ name, email, passwordHash, aadhaar, ownershipPaperFileName });

    await newAdmin.save();

    res.redirect('/adminlogin.html');
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).send('Server error during admin registration.');
  }
});

app.post('/admin/login-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).send('Invalid email or password');

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) return res.status(401).send('Invalid email or password');

    req.session.admin = { id: admin._id, name: admin.name, email: admin.email };
    res.redirect('/admin.html');
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).send('Server error during admin login.');
  }
});

app.get('/admin/logout-admin', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin-login.html');
});

app.get('/admin/session-info-admin', (req, res) => {
  const admin = req.session.admin;
  res.json({
    loggedIn: !!admin,
    name: admin?.name || null,
    email: admin?.email || null
  });
});

// Tenant routes

app.post('/submit-details', uploadTenant.single('photo'), async (req, res) => {
  try {
    const {
      tenantName,
      age,
      email,
      phone,
      numPeople,
      propertySelected,
      listedAmount,
      readyToPay,
      leaseTime,
      aadhaar,
      message 
    } = req.body;

    const photoPath = req.file ? req.file.path : null;

    const newTenant = new Tenant({
      tenantName,
      age,
      email,
      phone,
      numPeople,
      propertySelected,
      listedAmount,
      readyToPay,
      leaseTime,
      aadhaar,
      photo: photoPath,
      message 
    });

    await newTenant.save();

    res.redirect('/sucess.html');
  } catch (error) {
    console.error('Error saving tenant details:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
});

// Error handling middleware for any server errors
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
