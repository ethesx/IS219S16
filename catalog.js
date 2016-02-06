Catalog = new Mongo.Collection("catalog");

if (Meteor.isClient) {

    // This code only runs on the client
    Template.body.helpers({
        results: function () {
            return Catalog.find({});
        }
    });

    Template.body.events({

        "submit .isbnSearchForm": function (event) {
            // Prevent default browser form submit
            event.preventDefault();

            // Get value from form element
            var text = event.target.isbn;

            // Find a title from the collection
           /*
            Catalog.find({
                isbn: text
            });
*/
            // Clear form
            event.target.isbn = "cleared";

            console.log("cleared isbn text");
        }
    });
}

