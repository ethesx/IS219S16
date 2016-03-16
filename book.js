BNTermEnum = {

    AGE : "Age Range",
    ISBN : "ISBN-13",
    PUB : "Publisher",
    PUBDATE : "Publication Date",
    SERIES : "Series",
    DESC : "Edition description",
    PAGE : "Pages",
    LEXILE : "Lexile"
};

Book =  function(title, age, publisher, isbn, marked) {

    this.title = title;
    this.age = age;
    this.publisher = publisher;
    this.isbn = isbn;
    this.marked = marked;

}

BNBook = function () {

    this.lexile;
    this.page;
    this.pubDate;

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