Catalog = new Mongo.Collection("catalog");
File = new Mongo.Collection("file");
Tag = new Mongo.Collection("tag");
Review = new Mongo.Collection("review");

if(Meteor.isServer){

    Meteor.methods({
        'getData' : function (searchFor){
            //TODO static site data return for testing
            let data = ConstantsTest.websiteData;

            if(searchFor) {
                //TODO add ISBN vs title identifcation
                var dbSearchTerm = new RegExp(["^", searchFor.trim(), "$"].join(""), "i");
                var bookReport = new BookReport();
                var book;
                // Find a title or isbn from the collection
                //TODO handle multiple results
                var foundBookReport = Catalog.findOne({$or: [{"isbn": dbSearchTerm}, {"title": dbSearchTerm}]}, {_id: 0});

                //If we don't already have details on this book
                if (!foundBookReport){//.count() === 0) {
                    var origins = getOrigin();
                    //TODO order origins loop by noisbnsupport prop first if searchFor is title
                    for(var i = 0; i < origins.length; i++){
                        var item = origins[i];
                        let url = item.url;
                        url = new Buffer(url, 'base64').toString();
                        url += searchFor;
                        //var data = Scrape.url(url);
                        book = getParsedBookData(data, item.type);

                        if(book.title != undefined || book.isbn != undefined)
                            bookReport.books.push(book);
                    }
                    if(bookReport.books[0]) {
                        setReportProps(bookReport);

                        var insertedBook = Catalog.insert(bookReport);
                        //FIXME Looks to still return _id
                        foundBookReport = Catalog.findOne({_id: insertedBook}, {_id: 0});
                    }
                    return foundBookReport;
                }

                //console.log(foundBookReport.books);
                return foundBookReport;
            }
        },
        'parseFile' : function(file){
            let success = false;
            let results = Papa.parse(file.data, {
                worker: false,
                comments: true,
                complete: function(results, file){
                    console.log("finished");
                    console.log("results" + results);
                },
                error: function(error, file){
                    console.log("There was an error: " + error);
                },
                skipEmptyLines: true,
                delimiter: "\t",
            });
            results.data.forEach(loadparsedTitles);
            Review.insert(results.errors);
            File.update(file._id, {processed : true});
            //TODO try catch needed
            return success;
        },
        'resolveTitles' : function() {
            run = Meteor.setInterval(function () {
                var record = Tag.findOne().isbn;
                if(record)
                    Meteor.call("getData", record);
                else
                    Meteor.call('cancelResolveTitles');

            }, 1000);
        },
        'cancelResolveTitles' : function(){
            Meteor.clearInterval(run);
        },
    })

    function loadparsedTitles(result){

        console.log("row data" + result);

        let record = {
            title: result[0],
            subtitle: result[1],
            isbn: result[2],
            publisher: result[3],
            author: result[4],
            translator: result[5],
        }
        Tag.insert(record);
    }
    function resolveTitles(){

    };

    //retrieve sources for iteration
    function getOrigin(){
        return Constants.origin;
    };

    //
    function getParsedBookData(result, originType){
        var book = new Book();

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
        book.author = $("span.contributors > a").text();
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
            if (!bookReport.title) {
                bookReport.title = firstBook.title;
            }
            if (!bookReport.isbn) {
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
            return text;
        },

    });

    Template.upload.events({
        "click #uploadButton" : function(event, target){
            event.preventDefault();

            console.log("Fired upload submit");

            if (window.File && window.FileReader && window.FileList && window.Blob) {
                //TODO reference constant for file value object
                let file = target.find('#uploadFile').files[0];
                let reader = new FileReader();
                reader.onload = function(e) {
                    File.insert({
                        name: file.name,
                        type: file.type,
                        processed : false,
                        data: reader.result,
                    });
                }
                reader.readAsText(file);
                let dbfile = File.findOne({processed : false});
                Meteor.call("parseFile", dbfile, function(error, result){
                    if(error) {
                        console.log("parseFile error:" + error.reason);
                    }
                    console.log("parseFile callback success");
                    Session.set("uploadStatus", result);
                });
                //TODO add some notification on page with status
            }
            else //TODO define something better for client error
                console.log("This browser is unable to handle the file upload");
        },
        "change #uploadFile" : function(event, target) {
            console.debug(target);
            console.debug("JQuery file input target" + $(target));
            let input = target.$("#uploadFile"),
                numFiles = input.get(0).files ? input.get(0).files.length : 1,
                label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
            //TODO reference constant for file value object
            Utility.populateFileUploadValue(target.$("#uploadFileValue"), {numFiles: numFiles, label : label});
        },
        "click #resolveTitles" : function(event, target){
            Meteor.call("resolveTitles");
            //TODO consider return
        },
        "click #cancelResolveTitles" : function(event, target){
            Meteor.call("cancelResolveTitles");
            //TODO consider return
        },
    });

    Template.upload.helpers({

        upload : function(){
            return Session.get("uploadStatus");
        }

    });

    Template.registerHelper("objectToPairs",function(object){
        return _.map(object, function(value, key) {
            return {
                key: key,
                value: value
            };
        });
    });

    //TODO register helper for book type key to label values using book specific enum
    //TODO register helper for determination of mature content based on ages listed
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

