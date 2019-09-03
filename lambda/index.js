'use strict';
try {
    const config = require('./config/config');
    const Alexa = require('ask-sdk');
    const UserDb = require('voice-tools/lib/userdb/dynamodb')(config);
    const HandlerFactory = require('./handlers/HandlerFactory');
    exports.handler = Alexa.SkillBuilders.standard()
        .addRequestHandlers(
            new HandlerFactory('voice-tools/lib/platform/alexa/handlers/LaunchRequestHandler'),
            new HandlerFactory('voice-tools/lib/platform/alexa/handlers/HelpIntentHandler'),
            new HandlerFactory('voice-tools/lib/platform/alexa/handlers/StopIntentHandler'),
            new HandlerFactory('voice-tools/lib/platform/alexa/handlers/SessionEndedRequestHandler'),
            new HandlerFactory('voice-tools/lib/platform/alexa/handlers/FallbackIntentHandler'),
        )
        .addErrorHandlers(
           //new HandlerFactory('voice-tools/lib/platform/alexa/handlers/ErrorHandler')
        )
        .withDynamoDbClient(new UserDb())
        .withTableName(config.userTableName)
        .withAutoCreateTable(true)
        .lambda();
} catch(e) {
    console.log("LAMBDA SETUP ERROR", e);
}