const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const bodyParser = require('body-parser');
const db = require('./db'); // Import the database connection
require('./auth');
app.use('/public', express.static(path.join(__dirname, 'public')));

const static_path = path.join(__dirname, '/public');
const port = 3000 || process.env.port;


// Middleware
app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());

app.post('/save-user-data', (req, res) => {
    const { name, email, age, height, weight, bmi } = req.body;

    // Insert or update user data into the 'user_profiles' table based on email
    const sqlInsertUpdate = `
        INSERT INTO users (email, name, age, height, weight, bmi) 
        VALUES (?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE name=?, age=?, height=?, weight=?, bmi=?`;

    const values = [email, name, age, height, weight, bmi, name, age, height, weight, bmi];

    db.query(sqlInsertUpdate, values, (err, result) => {
        if (err) {
            console.error('Error saving/updating user profile:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        console.log('User profile saved/updated successfully');
        res.sendFile(`${static_path}/dashboard.html`); // Redirect to the dashboard after saving data
    });
});

// Route to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(`${static_path}/homepage.html`);
});

// Route for Google authentication
app.get('/auth/google',
    passport.authenticate('google', { scope: ['email', 'profile'] })
);

// Callback route after Google authentication
app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/protected',
        failureRedirect: '/auth/google/failure'
    })
);



// Logout route
app.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy();
    res.send('Goodbye!');
});

// Failure route for Google authentication
app.get('/auth/google/failure', (req, res) => {
    res.send('Failed to authenticate..');
});

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401);
}

// Protected route after successful authentication
app.get('/protected', isLoggedIn, (req, res) => {
    res.sendFile(`${static_path}/bmi.html`);
});
// Route to retrieve user data to the database
app.get('/retrieve-data', isLoggedIn, (req, res) => {
  const userEmail = req.user.email; // Assuming your user object has an 'email' property

  // Your SQL query
  const sqlQuery = 'SELECT * FROM users WHERE email = ?'; // Assuming your table is named 'users'

  // Execute the query
  db.query(sqlQuery, [userEmail], (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      // Send the retrieved data as JSON
      res.json(result);
    }
  });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
