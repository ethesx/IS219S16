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
            var text = event.target.isbn.value;

            // Find a title from the collection
            Catalog.find({
                isbn: text
            });
            // Clear form
            event.target.isbn.value = "";
        },
        "click #aLookup" : function(){
            console.debug("Lookup fired");
        },
        "click #aUpload" : function(){
            console.debug("Upload fired");
        },
        "click #aScan" : function(){
            console.debug("Scan fired");
        },
        "click #aResults" : function(){
            console.debug("Results fired");
        },
    });
}

