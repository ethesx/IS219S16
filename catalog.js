Catalog = new Mongo.Collection("catalog");

if(Meteor.isServer){

    Meteor.methods({
        'getData' : function (searchFor){
            //TODO static site data return for testing
            let data = ConstantsTest.websiteData;

            if(searchFor) {
                searchFor = new RegExp(["^", searchFor.trim(), "$"].join(""), "i");

                var bookReport = new BookReport();
                var book;
                // Find a title or isbn from the collection
                var foundBookReport = Catalog.find({$or: [{"isbn": searchFor}, {"title": searchFor}]}, {_id: 0}).fetch();

                //If we don't already have details on this book
                if (foundBookReport.length === 0){//.count() === 0) {
                    getOrigin().forEach(function (item) {
                        let url = item.url;
                        url = new Buffer(url, 'base64').toString();
                        url = url.substring(0, url.length - 1) + searchFor;
                        //data = Scrape.url(url);
                        book = getParsedBookData(data, item.type);
                        bookReport.books.push(book);
                    });
                    setReportProps(bookReport);

                    var insertedBook = Catalog.insert(bookReport);
                    //FIXME Looks to still return _id
                    foundBookReport = Catalog.find({_id: insertedBook}, {_id: 0}).fetch();

                    return foundBookReport;
                }

                console.log(foundBookReport.books);
                return foundBookReport;
            }
        },
    })

    //retrieve sources for iteration
    function getOrigin(){
        return Constants.origin;
    };

    //
    function getParsedBookData(result, originType){
        var book;

        switch (originType) {
            case Constants.originTypes.BN :
                book = parseBNData(result);
                break;
            /*case Constants.originTypes.CSM :
                book = createNewFunc(doc);
                break;*/
            default :
                break;
        }
        return book;
    };

    //Parses source specific data
    function parseBNData(result){
        var $ = cheerio.load(result);
        var data = $("#ProductDetailsTab dt, #ProductDetailsTab dd");
        var book = new BNBook();
        book.title =  $("#prodSummary > h1[itemprop]").text();
        $(data).each(function(i){
            var item = $(this);
            if (item.is("dt")) {
                book.populateFromSite(item.text(), item.next("dd").text());
            }
        });
        return book;
    };

    //Sets the props for the common props across all books in the report
    function setReportProps(bookReport){
        var firstBook = bookReport.books[0];
        if(bookReport && firstBook) {
            if (!title) {
                bookReport.title = firstBook.title;
            }
            if (!isbn) {
                bookReport.isbn = firstBook.isbn;
            }
        }
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

    Template.lookup.events({
        "submit .isbnSearchForm": function (event, target) {
            // Prevent default browser form submit
            event.preventDefault();

            // Get value from form element
            var text = event.target.isbn.value;

            Meteor.call("getData", text, function(error, result){
                if(error) {
                    console.log(error.reason);
                }
                console.log("getData callback success");
                //TODO: need to check set Session
                Session.set("search", result);
            });
            // Clear form
            event.target.isbn.value = "";
        },
    });

    Template.lookup.helpers({
        searchResults : function(){
            var text = Session.get("search");
            console.log("RAN lookup helper" + text );
        },
    });



    Template.body.helpers({

    });

    Template.body.events({


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

