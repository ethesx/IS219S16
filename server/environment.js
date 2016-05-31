Accounts.validateNewUser(function(user){
    if (user.username && user.username.length >= 6)
        return true;
    throw new Meteor.Error(403, "Username must have at least 6 characters");

});