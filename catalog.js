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
        "click #aLookup" : function(event, target){
            console.debug("Lookup fired");
            Blaze.renderWithData(Template.lookup, {my: "data"}, target.$("#content").get(0))
        },
        "click #aUpload" : function(){
            console.debug("Upload fired");
            Blaze.renderWithData(Template.upload, {my: "data"}, target.$("#content").get(0))
        },
        "click #aScan" : function(){
            console.debug("Scan fired");
            Blaze.renderWithData(Template.scan, {my: "data"}, target.$("#content").get(0))
        },
        "click #aResults" : function(){
            console.debug("Results fired");
            Blaze.renderWithData(Template.results, {my: "data"}, target.$("#content").get(0))
        },
    });
}

