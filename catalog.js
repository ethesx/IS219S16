Catalog = new Mongo.Collection("catalog"); //All resolved titles
File = new Mongo.Collection("file"); //Contains original uploaded files
Tag = new Mongo.Collection("tag"); //Contains parsed titles which need resolution

if(Meteor.isServer){
var run;
    Meteor.methods({
        'getData' : function (searchFor){
            //TODO static site data return for testing - uncomment scrape
            //let data = ConstantsTest.websiteNewData;

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
                        //TODO static site data return for testing
                        var data = Scrape.url(url);
                        book = getParsedBookData(data, item.type);

                        if((book.title !== "" && book.title) || (book.isbn !== "" && book.isbn))
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

        'saveUploadFile' : function(object){
            return File.insert({
                name: object.file.name,
                type: object.file.type,
                processed: false,
                data: object.result,
            });
        },
        'getUploadFile' : function(fileId){
            return File.findOne(fileId);
        },

        'parseFile' : function(file){
            let secondIteration = false; //Papaparse workaround https://github.com/mholt/PapaParse/issues/231
            let success = false;
            let results = Papa.parse(file.data, {
                worker: false,
                comments: true,
                complete: function(results, file){
                    if(secondIteration)
                        return;
                    else
                        secondIteration = true;

                    console.log("finished");
                    console.log("results" + results);
                    success = true;
                },
                error: function(error, file){
                    console.log("There was an error: " + error);
                },
                skipEmptyLines: true,
                delimiter: "\t",
            });
            results.data.forEach(loadparsedTitles, file._id);
            //TODO try catch finally needed
            File.update(file._id, {$set:{processed : true, parseErrors : results.errors, parseMeta : results.meta}});
            return success;
        },

        'toggleResolveTitles' : function(start){
            if(!start || (run && run.ontimeout === undefined)) {
                Meteor.clearTimeout(run);
                return false;
            }
            else if(start || (!run || run.ontimeout === null)) {
                return resolveTitles();
            }
        },
        'latestFileId' : function(){
            return File.find({},{sort : {_id : -1}, limit : 1}).fetch()[0]._id;
        },
        'markTitle' : function(selectedItem){
            return Catalog.update(selectedItem._id, {$set : {marked : true,markedDate : Date.now()}});
        },
        'undoMarkTitle' : function(){
            var lastMarked = Catalog.find({marked : true},{sort : {markedDate : 1}, limit : 1}).fetch()[0];
            return Catalog.update(lastMarked._id, {$set : {marked : false, markedDate : null}});
        },
        'getCatalogUnmarked' : function(){
            return Catalog.find({$or : [{marked : false},{marked : null}]}).fetch();
        },
        'getCatalogUnmarkedBookReport' : function(){
            var result = Meteor.call('getCatalogUnmarked');
            if(result) {
                result.forEach(function (bookReport, i) {
                    bookReport.author = bookReport.books[0].author;
                    bookReport.age = bookReport.books[0].age;
                    bookReport.books = null;
                });
            }
            return result;
        },
        "createNewUser" : function(user){
            return Accounts.createUser(user);
        },

    });

    function resolveTitles(){

        var delay = Math.round(Math.random() * 10000); // from 1-10sec random intervals
        //FIXME FOR TESTING
        //var delay = 1000;
        console.log("Will try resolving a title in " + delay/1000 + " seconds");
        run = Meteor.setTimeout(function () {

            //TODO work on returning title if no isbn once title resolution is in place
            //TODO setup way to rerun titles with errors
            var record = Tag.findOne({$and : [{processed : false, error : {$exists : false}}]});


            if(record) {
                console.log("Resolving a title");
                //TODO create service for getData call - this is our second reference
                Meteor.call("getData", record.isbn, function (error, result) {
                    if (error) {
                        console.log("getDataError" + error.reason);
                        //TODO temporary - pull aggregate or highest age
                        Tag.update(record._id, {$set : {processed : true, error : error}});
                        Meteor.clearTimeout(this);
                        return true;
                    }
                    else {
                        console.log("getData successful callback");
                        if(result)
                            Tag.update(record._id, {$set : {processed : true, age : result.books[0].age}});
                        else
                            Tag.update(record._id, {$set : {processed : true, error : "No results"}});
                        resolveTitles();
                    }
                });
            }
            else {
                Meteor.clearTimeout(this);
                console.log("No titles left to resolve - work complete");
                return true;
            }
        }, delay);
    };

    function loadparsedTitles(result) {

        console.log("row data" + result);

        let record = {
            title: result[0],
            subtitle: result[1],
            isbn: result[2],
            publisher: result[3],
            author: result[4],
            translator: result[5],
            processed : false,
            fileId : this.toString(),
        };
        //TODO update after implementing ability to process titles
        if(!record.isbn || record.isbn === null || record.isbn == "")
            record.error = "ISBN missing,";
        if(!record.title || record.title === null || record.title == "")
            record.error += "Title missing,";

        var exists = false;
        //We are not processing duplicates
        if(!record.error)
            exists = Tag.findOne({$or : [{isbn : record.isbn}, {title : record.title}]});
        if(!exists)
            Tag.insert(record);
    }
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
        var data = $("#ProductDetailsTab th, #ProductDetailsTab td");
        var book = new BNBook();

        book.title =  $("#pdp-header-info > h1[itemprop]").text();
        book.author = $("span#key-contributors > a").text();

        $(data).each(function(i){
            var item = $(this);
            if (item.is("th")) {
                book.populateFromSite(item.text(), item.next("td").text());
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
    Meteor.publish('tag', function () {
        return Tag.find({}, {});
    });
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
            return Session.get("search");
        },

    });

    Template.upload.events({
        "click #uploadButton" : function(event, target){
            event.preventDefault();

            console.log("Fired upload submit");
            let file = target.find('#uploadFile').files[0];

            if (file && window.File && window.FileReader && window.FileList && window.Blob) {
                //TODO reference constant for file value object

                let reader = new FileReader();
                let dbFile;
                reader.onload = function(){Meteor.call("saveUploadFile",
                    {file : file, result : reader.result},
                    function(error, dbFileId){
                        if(error)
                            console.log("saveUploadFile error:" + error.reason);
                        else {
                            console.log("saveUploadFile callback success");

                            Meteor.call("getUploadFile", dbFileId, function(error, dbFile){
                                if(error)
                                    console.log("getUploadFile error:" + error.reason);
                                else {
                                    console.log("getUploadFile callback success");
                                    Session.set("latestTagFileId", dbFileId);
                                    Meteor.call("parseFile", dbFile, function(error, result){
                                        if(error) {
                                            console.log("parseFile error:" + error.reason);
                                        }
                                        console.log("parseFile callback success");
                                        Session.set("uploadStatus", result);
                                    });
                                }
                            });
                        }
                    }
                )};
                reader.readAsText(file);
            }
            else { //TODO define something better for client error
                console.log("This browser is unable to handle the file upload");
                Session.set("uploadStatus", "FAILED");
            }
                //TODO add some notification on page with status
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

            Meteor.call("toggleResolveTitles", true, function(error, result){
                if(error)
                    console.log("Error calling toggleResolveTitles" + error.reason);
                else {
                    console.log("toggleResolveTitles successful callback");
                    //Session.set("processingTitles", result);
                }
            });
            //Session.set("processingTitles", true);

        },
        "click #cancelResolveTitles" : function(event, target){
            console.log("cancelResolveTitles");

            Meteor.call("toggleResolveTitles", false, function(error, result){
                if(error)
                    console.log("Error calling toggleResolveTitles" + error.reason);
                else {
                    console.log("toggleResolveTitles successful callback");
                }
            });
        },
    });
    Tracker.autorun(() => {
        Meteor.subscribe('tag');
    });
    Template.upload.helpers({

        uploadStatus : function(){
            return Session.get("uploadStatus");
        },
        taggedList : function(){
            var latestFileId = Session.get("latestTagFileId");
            return Tag.find({$and : [{fileId : latestFileId, processed : true, error : {$exists : false}}]}).fetch();
        },
        results : function(){
            //var latestFileId = File.find({},{sort : {_id : -1}, limit : 1}).fetch()[0]._id;

            var latestFileId = Session.get("latestTagFileId");
            //TODO Mapreduce me
            var results = {
                total : Tag.find({fileId : latestFileId}).count(),
                tagged : Tag.find({$and : [{fileId : latestFileId, processed : true, error : {$exists : false}}]}).count(),
                review : Tag.find({$and : [{fileId : latestFileId, error : {$exists : true}}]}).count(),
            };

              return results;
        },
        reviewList : function(){
            var latestFileId = Session.get("latestTagFileId");
            return Tag.find({$and : [{fileId : latestFileId, error : {$exists : true}}]}).fetch();
        },
        isProcessing : function(){
            var isProcessing = Session.get("processingTitles");
            if(isProcessing)
                return "Stop";
            else
                return "Start";
        },


    });

    Template.results.helpers({
        unmarkedTotal : function(){

            return Session.get('getCatalogUnmarkedTotal');
        },
    });

    Template.results.onRendered(function(){

        Utility.getCatalogData(this);
    });

    Template.results.events({

        'click #markedButton' : function(event, target){
            var bst = target.$('#bootstrap-table');
            var selected = bst.bootstrapTable('getSelections');
            selected.forEach(function(selectedItem){
                Meteor.call('markTitle', selectedItem, function(error, result){
                    if(error)
                        console.log("markTitle error:" + error.reason);
                    else {
                        console.log("markTitle callback success");
                        if(result === 1){
                            bst.bootstrapTable('removeByUniqueId', selectedItem._id);
                            Utility.setUpdatedCatalogTotal(-1);
                        }
                    }
                });
            });
        },
        'click #undoButton' : function(event, target){
            Meteor.call('undoMarkTitle', function(error, result){
                if(error)
                    console.log("undoMarkTitle error:" + error.reason);
                else {
                    console.log("undoMarkTitle callback success");
                    if(result === 1){
                        Utility.refreshCatalogData(target);
                    }
                }
            });
        },
        'click button[name=refresh]' : function(event, target){ //hacked event refresh.bs.table not captured
            console.log('refreshing data');
            Utility.refreshCatalogData(target);
        },
    });

    Template.registerHelper("objectToPairs",function(object){
        return _.map(object, function(value, key) {
            return {
                key: key,
                value: value
            };
        });
    });

    Template.registerHelper("isMature", function(object){return Utility.isMature(object);});

    //TODO register helper for book type key to label values using book specific enum
    //TODO register helper for determination of mature content based on ages listed
    Template.body.helpers({
        changePass : function(){
            var result = Session.get("changePass");
            return result;
        },
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
        "click #logout" : function(event, target){
            event.preventDefault();
            Meteor.logout();
            //accountsClient.logout([callback])
        },
        "click #createUser" : function(event, target){
            event.preventDefault();

            var user = {
                email : target.$("#email").val(),
                username : target.$("#email").val(),
                password : target.$("#password").val()
            };
            Meteor.call('createNewUser', user, function(error, result){
                if(error)
                    console.log(error);
                else
                    console.log(result);
            });
            //accountsClient.logout([callback])

        },
        "click #changePass" : function(event, target){
            event.preventDefault();
            Accounts.changePassword(
                target.$("#oldP").val(),
                target.$("#newP").val(),
                function(error) {
                    var result = {};
                    if (error) {
                        console.log(error);
                        result.success = false;
                        result.reason = error.reason;
                        Session.set("changePass", result);
                    }
                    else {
                        result.success = true;
                        result.reason = "Password updated";
                        Session.set("changePass", result);
                    }
                }
            );
        },
        "input #reP" : function(event, target){
            if(target.$('#newP').val() === event.target.value) {
                target.$('#changePass').prop("disabled", false);
                target.$('#rePWarning').addClass('hidden');
            }
            else {
                target.$('#changePass').prop("disabled", true);
                target.$('#rePWarning').removeClass('hidden');
            }
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
        setUpdatedCatalogTotal(val){
            Session.set('getCatalogUnmarkedTotal', Session.get('getCatalogUnmarkedTotal') + val);
        },
        getCatalogData(target){
            Meteor.call('getCatalogUnmarkedBookReport', function(error, result){
                if(error)
                    console.log("getCatalogUnmarkedBookReport error:" + error.reason);
                else {
                    console.log("getCatalogUnmarkedBookReport callback success");
                    Session.set('getCatalogUnmarkedTotal', result.length);
                    target.$('#bootstrap-table').bootstrapTable({data : result, rowStyle : Utility.isMatureClass});
                }
            });
        },
        refreshCatalogData(target){
            Meteor.call('getCatalogUnmarkedBookReport', function(error, result){
                if(error)
                    console.log("getCatalogUnmarkedBookReport error:" + error.reason);
                else {
                    console.log("getCatalogUnmarkedBookReport callback success");
                    Session.set('getCatalogUnmarkedTotal', result.length);
                    target.$('#bootstrap-table').bootstrapTable('load', result);
                }
            });
        },
        isMature(object){
            if(object) {
                var isMature = false;
                var ages = object.split("-");
                ages.forEach(function (item) {
                    item.trim();
                });

                if (ages[0] >= 14)
                    isMature = true;

                return isMature;
            }
        },
        isMatureClass(row, index){
            console.log("isMatureClass : " + row.age);

            if(Utility.isMature(row.age))
                return {"classes" : "danger"};
            else
                return {"classes" : ""};
        },

    };



}