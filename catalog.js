Catalog = new Mongo.Collection("catalog");

if(Meteor.isServer){

    Meteor.methods({
        'getData' : function (isbn){
            let url = "aHR0cDovL3NlYXJjaC5iYXJuZXNhbmRub2JsZS5jb20vYm9va3NlYXJjaC9pc2JuSW5xdWlyeS5hc3A/ej15JkVBTj0+";
            url = new Buffer(url, 'base64').toString();
            url = url.substring(0,url.length-1) +isbn;
            let websiteData = Scrape.url(url);
            return(websiteData);
          },

    })

}
if(Meteor.isCordova){

    Meteor.startup(function () {
        cordova.plugins.barcodeScanner.scan(
            function (result) {
                alert("We got a barcode\n" +
                    "Result: " + result.text + "\n" +
                    "Format: " + result.format + "\n" +
                    "Cancelled: " + result.cancelled);
            },
            function (error) {
                alert("Scanning failed: " + error);
            }
        );
    });
}

if (Meteor.isClient) {

    // This code only runs on the client
    Template.body.helpers({
        results: function () {
            return Catalog.find({});
        },
    });

    Template.body.events({

        "submit .isbnSearchForm": function (event, target) {
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
            Meteor.call("getData", text,
                function (error, result) {
                    if (error) {
                        console.log(error.reason);
                        return;
                    }
                    console.debug("successful callback");

                    var doc = $($.parseHTML(result));
                    var data = doc.find("#ProductDetailsTab dt, #ProductDetailsTab dd");
                    data.each(function(i){
                        var tag = "";
                        if((tag = this.tagName) === "DT")
                            console.log(this.textContent);
                        }
                    );
                    return data;
                }
            )
        },
        "click #aLookup, click #aHome" : function(event, target){
            console.debug("Lookup fired");
            Utility.clearContent(target);
            Blaze.renderWithData(Template.lookup, {my: "data"}, target.$("#content").get(0))
        },
        "click #aUpload" : function(event, target){
            console.debug("Upload fired");
            Utility.clearContent(target);
            Blaze.renderWithData(Template.upload, {my: "data"}, target.$("#content").get(0))
        },
        /*"click #aScan" : function(event, target){
            console.debug("Scan fired");
            Utility.clearContent(target);
            Blaze.renderWithData(Template.scan, {my: "data"}, target.$("#content").get(0))
        },*/
        "click #aResults" : function(event, target){
            console.debug("Results fired");
            Utility.clearContent(target);
            Blaze.renderWithData(Template.results, {my: "data"}, target.$("#content").get(0))
        },
        "change #uploadFile" : function(event, target) {
            console.debug(target);
            console.debug("JQuery file input target" + $(target));
            let input = target.$("#uploadFile"),
                numFiles = input.get(0).files ? input.get(0).files.length : 1,
                label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
            //TODO reference constant for file value object
            Utility.populateFileUploadValue(target.$("#uploadFileValue"), {numFiles: numFiles, label : label});


        }
    });

    var Utility = {

        clearContent(target){
            target.$("#content").empty();
        },
        populateFileUploadValue(obj, dataObj) {
            console.debug("Populating file upload: numFiles = " + dataObj.numFiles + " label = " + dataObj.label);
            console.debug(obj);
            obj.get(0).value = dataObj.label;
        },
    };

    var DataSlog = {

        retrieve : function(isbn) {



           /* $.ajax({
                url: url,
                crossDomain : false,
                headers : {"Access-Control-Request-Headers" : "Access-Control-Allow-Origin:*"},
                //contentType : "text/plain",
                success: function(){
                    let sub = data.substr(0, 200);
                    console.debug("ATA: "+sub);
                    return ( "Load was performed. Retrieved: " + sub);
                },
                dataType: "html"
            });*/

        },
    };
}

