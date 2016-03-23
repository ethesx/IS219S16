BNTermEnum = {

    AGE : "Age Range",
    ISBN : "ISBN-13",
    PUB : "Publisher",
    PUBDATE : "Publication Date",
    SERIES : "Series",
    DESC : "Edition description",
    PAGE : "Pages",
    LEXILE : "Lexile",
    AUTHOR : "Author",
};

var normalizeISBN = function(isbn){
    if(isbn)
        isbn.trim().replace("-", "");
    return isbn;
};
BookReport = function(isbn, title, marked, books){
    this.title = title ? "" : title;
    this.isbn = isbn ? "" : normalizeISBN(isbn);
    this.marked = marked ? false : marked;
    this.books = books ? new Array(books) : new Array();
    this.markedDate = "";
    this.modifiedDate = "";
};

Book =  function(title, author, age, publisher, isbn, origin) {

    this.title = title;
    this.author = author;
    this.age = age;
    this.publisher = publisher;
    this.isbn = normalizeISBN(isbn);
    this.origin = origin;
};

BNBook = function () {

    this.lexile = "";
    this.page = "";
    this.pubDate = "";
    this.origin = Constants.originTypes.BN;

    this.populateFromSite = function populateFromSite(term, value) {

        if(term !== undefined)
            term = term.trim().replace(":", "");
        if(value !== undefined)
            value = value.trim();

        switch (term) {
            case BNTermEnum.AGE :
                value = value.substring(0, value.indexOf(" Years"));
                this.age = value;
                break;
            case BNTermEnum.ISBN :
                this.isbn = value;
                break;
            case BNTermEnum.LEXILE :
                value = value.substring(0, value.indexOf(" "));
                this.lexile = value;
                break;
            case BNTermEnum.PAGE :
                this.page = value;
                break;
            case BNTermEnum.PUB :
                this.publisher = value;
                break;
            case BNTermEnum.PUBDATE :
                this.pubDate = value;
                break;
            default :
                break;
        }
    };


};

BNBook.prototype = new Book();
BNBook.prototype.constructor =  Book;
//CSMBook.prototype = new Book();