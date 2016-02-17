Catalog = new Mongo.Collection("catalog");

if (Meteor.isClient) {

    // This code only runs on the client
    Template.body.helpers({
        results: function () {
            return Catalog.find({});
        },
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
            Utility.clearContent(target);
            Blaze.renderWithData(Template.lookup, {my: "data"}, target.$("#content").get(0))
        },
        "click #aUpload" : function(event, target){
            console.debug("Upload fired");
            Utility.clearContent(target);
            Blaze.renderWithData(Template.upload, {my: "data"}, target.$("#content").get(0))
        },
        "click #aScan" : function(event, target){
            console.debug("Scan fired");
            Utility.clearContent(target);
            Blaze.renderWithData(Template.scan, {my: "data"}, target.$("#content").get(0))
        },
        "click #aResults" : function(event, target){
            console.debug("Results fired");
            Utility.clearContent(target);
            Blaze.renderWithData(Template.results, {my: "data"}, target.$("#content").get(0))
        },
    });

    var Utility = {

        clearContent(target){
            target.$("#content").empty();
        }
    };
}

