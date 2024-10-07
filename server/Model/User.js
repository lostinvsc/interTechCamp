const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email:String,
    history:[Object],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
