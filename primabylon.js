// Global-Part

var Messages = new Meteor.Collection("messages");
var Translations = new Meteor.Collection("translations");
var isTranslated = false;

// helper function

function addslashes(str) {
    return (str + '').replace(/([\\'])/g, "\\$1").replace(/\0/g, "\\0");
}

// helper time format (time object)

function timeformat(obj) {

    var currentHours = obj.getHours();
    var currentMinutes = obj.getMinutes();
    var currentSeconds = obj.getSeconds();

    currentHours = (currentHours < 10 ? "0" : "") + currentHours;
    currentMinutes = (currentMinutes < 10 ? "0" : "") + currentMinutes;
    currentSeconds = (currentSeconds < 10 ? "0" : "") + currentSeconds;

    return time = currentHours + ":" + currentMinutes + ":" + currentSeconds;

}

// Client-Part

if (Meteor.isClient) {

    Meteor.startup(function() {
        Session.set("username", undefined);
        Session.set("sl", undefined);
    });

    // Yahoo Query Language Wrapper for jQuery
    $.YQL = function(query, callback) {

        if (!query || !callback) {
            throw new Error('$.YQL(): Parameters may be undefined');
        }

        var url = "http://query.yahooapis.com/v1/public/yql?q=" + query + "&format=json&env=store://datatables.org/alltableswithkeys&callback=?";
        $.getJSON(url, callback);

    };


    // global helper: is the Session set?
    Handlebars.registerHelper('chatUser', function() {
        if (Session.get("username") && Session.get("sl")) {
            return true;
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////
    Template.line.MessageList = function() {

        isTranslated = false;

        Messages.find({}, { sort: { created: 1} }).forEach( function(message) {

            if (message.userlang != Session.get("sl") && $.inArray(Session.get("sl"), message.languages) != 0) {

                console.log("Nachrichten in anderer Sprache und nicht verarbeitet!");

                var yq = encodeURIComponent("select json.json.json from google.translate where q='" + addslashes(message.text) + "' and source='" + message.userlang + "' and target='" +  Session.get("sl") + "' limit 1");

                $.YQL(yq, function(data) {

                    var post = data.query.results.json.json.json.json;

                    if (post) {

                        isTranslated = true;

                        Translations.insert({text: post,
                                             user: message.user,
                                             userlang: Session.get("sl"),
                                             created: message.created,
                                             time: message.time});

                        
                    } 

                });
            } 
        });
        
        return Translations.find({userlang: Session.get("sl")}, {sort: {created: 1}});

    };

    Template.line.rendered = function() {
        $('#mymessage').val('');
        
        if(isTranslated) {
            Messages.update({}, {$push: {languages: Session.get("sl")}});
        }
    };

    Template.hello.events({
        "keydown #mymessage": function(event) {

            var code = (event.keyCode ? event.keyCode : event.which);

            if (code == 13) {

                var text = $('#mymessage').val();
                var curdate = new Date();
                var curtime = timeformat(curdate);

                Messages.insert({text: text,
                                 user: Session.get("username"),
                                 userlang: Session.get("sl"),
                                 created: curdate,
                                 time: curtime
                });

                Translations.insert({text: text, 
                                     user: Session.get("username"),
                                     userlang: Session.get("sl"),
                                     created: curdate,
                                     time: curtime
                });                

            }
        },
        "click #btn-sess" : function () {
            
            var username = $('input:text[name=username]').val();
            var sl = $('#sl').val();

            if (username && sl) {

                Session.set("username", username);
                Session.set("sl", sl);

            }
        }
    });
}

// Server-Part

if (Meteor.isServer) {
    Meteor.startup(function() {

        Messages.remove({});
        Translations.remove({});

        Messages._ensureIndex({created:1, userlang: 1}, {unique: true});
        Translations._ensureIndex({created:1, userlang: 1}, {unique: true});

    });

}