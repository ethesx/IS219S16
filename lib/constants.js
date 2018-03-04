import {Meteor} from "meteor/meteor";

Constants = {
    originTypes : {
        BN : "Barnes and Noble",
        CSM : "Common Sense Media",
    },
    get origin(){return [
        {url : "aHR0cDovL3NlYXJjaC5iYXJuZXNhbmRub2JsZS5jb20vYm9va3NlYXJjaC9pc2JuSW5xdWlyeS5hc3A/ej15JkVBTj0", type : this.originTypes.BN, hasIsbnSupport : true, isInactive : false},
       // {url : "aHR0cHM6Ly93d3cuY29tbW9uc2Vuc2VtZWRpYS5vcmcvYm9vay1yZXZpZXdzLw==", type : this.originTypes.CSM, hasIsbnSupport : false, isInactive : true},
    ]},
    resetOptions: {
        "options": {
            "headers": {
                "Authorization": "Bearer" + Meteor.settings.API_KEY,
                "Content-Type": "application/json",
                "Accept": Meteor.settings.API_REQUEST_HEADER_ACCEPT
            }
        }
    };
};
