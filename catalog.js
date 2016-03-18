Catalog = new Mongo.Collection("catalog");

if(Meteor.isServer){

    Meteor.methods({
        'getData' : function (searchFor){
            //TODO static site data return for testing
            let websiteData = ConstantsTest.websiteData;
            let books = [];

            getOrigin().forEach(function(item){
                let url = item.url;
                url = new Buffer(url, 'base64').toString();
                url = url.substring(0,url.length-1) + searchFor;
                //TODO add call return parsed data object, add to books[]
                //websiteData = Scrape.url(url);

            });

            return(websiteData);
          },
    })

    //retrieve sources for iteration
    function getOrigin(){
        return Constants.origin;
    };

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
            text = new RegExp(["^", text.trim(), "$"].join(""), "i");

            // Find a title or isbn from the collection
            var foundBooks = Catalog.find({$or: [{"isbn": text}, {"title": text}]}, {_id: 0});

            //Set as return to below call
            var bookReport = new Array();
            // Clear form
            event.target.isbn.value = "";

            //If we don't already have details on this book
            if (foundBooks.count() === 0) {
                Meteor.call("getData", text,
                    function (error, result) {
                        if (error) {
                            console.log(error.reason);
                            return;
                        }
                        console.debug("successful callback");
                        //TODO create func to iterate over available feeds
                        var doc = $($.parseHTML(result));


                        //TODO BN feed specific break me out
                        var data = doc.find("#prodSummary > h1[itemprop], #ProductDetailsTab dt, #ProductDetailsTab dd");
                        var book = new BNBook();

                        for (var i = 0; i < data.length; i++) {
                            var item = data[i]
                            if (item.tagName === "H1") {
                                console.log(item.textContent);
                                book.title = item.textContent;
                            }
                            else if (item.tagName === "DT") {
                                console.log(item.textContent);
                                console.log(item);
                                book.populateFromSite(item.textContent, data[++i].textContent);
                            }
                            /*else if (this.tagName === "DD"){
                             console.log(this.textContent);
                             }*/
                            //});
                        }
                        console.log(book);
                        bookReport.push(book);
                        var insertedBook = Catalog.insert(bookReport);
                        //FIXME Looks to still return _id
                        //TODO perform
                        foundBooks = Catalog.find({id: insertedBook._id}, {_id: 0});

                        //iterate through the cursor, create BookResult for return
                        //TODO make this a server function
                        foundBooks.forEach(function () {
                            bookReport.push(book);
                        });
                        return bookReport;
                    }
                )
            }
            else {
                //iterate through the cursor, create BookResult for return
                //TODO make this a server function
                foundBooks.forEach(function (book) {
                    bookReport.push(book);
                });
            }
            return bookReport;
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

}

