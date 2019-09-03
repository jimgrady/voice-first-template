'use strict';

const config = require('../config/config');
const Content = require('voice-tools/lib/content/airtable');
const content = new Content(config);
const fs = require('fs');
const ejs = require('ejs');
const outputDir = '../handlers_gen';
const outputIndex = '../index_gen.js';
const outputModel = '../test/setup/models/en-US.json';
const requestHandlers = {
    LaunchRequest: 'voice-tools/lib/platform/alexa/handlers/LaunchRequestHandler',
    HelpIntent: 'voice-tools/lib/platform/alexa/handlers/HelpIntentHandler',
    StopIntent: 'voice-tools/lib/platform/alexa/handlers/StopIntentHandler',
    SessionEndedRequest: 'voice-tools/lib/platform/alexa/handlers/SessionEndedRequestHandler',
    FallbackIntentHandler: 'voice-tools/lib/platform/alexa/handlers/FallbackIntentHandler',
    LoadTestStateIntentHandler: 'voice-tools/lib/platform/alexa/handlers/LoadTestStateIntentHandler'
};
const errorHandlers = {
    Error: 'voice-tools/lib/platform/alexa/handlers/ErrorHandler'
};

const handlerTemplate = fs.readFileSync(`${__dirname}/template/Handler.ejs`).toString('utf-8');
const indexTemplate = fs.readFileSync(`${__dirname}/template/index.ejs`).toString('utf-8');

let records = {};
let slots = {};
let intents = [];
let children = {};
let yesHandlerGenerated = false;
let yesResponses = [];
let noHandlerGenerated = false;
let noResponses = [];
let fallbackHandlerGenerated = false;
let fallbackResponses = [];

let alternates = {};

function titleCase(str) {
    let separator = '-';
    return str.toLowerCase().split('-').map(function(word) {
        return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join('');
}

function intentNameFromRecord(record) {
    if (record.get('Request Type') === 'LaunchRequest') {
        return 'LaunchRequest';
    }
    let id = record.get('Id');
    return titleCase(id.replace(/-request$/, '')) + 'Intent';
}

function extractSlots(template) {
    let matches = template.match(/\{([A-Z][a-zA-Z]*)\}/g);
    if (!matches) {
        return [];
    }
    let slotNames = matches.map(slot => slot.replace(/[\{\}]/g, ''));
    let slotDefs = [];
    slotNames.forEach(slotName => {
        slotDefs.push({
            name: slotName,
            type: slots[slotName]
        });
    });
    return slotDefs;
}

function json(obj) {
    return JSON.stringify(obj, null, 2);
}

function rejson(str) {
    return json(JSON.parse(str));
}

async function fetchFlows() {
    await content.fetchTable(
        'Slots',
        'Grid view',
        record => {
            slots[record.get('Id')] = record.get('Type');
        }
    );
    await content.fetchTable(
        'Flows',
        'All',
        record => {
            let voiceContent = record.get('Voice Content') || '';
            if (voiceContent.indexOf('[') === -1) {
                records[record.id] = record;
            }
        }
    );
    await content.fetchTable(
        'Alternates',
        'Grid view',
        record => {
            alternates[record.id] = record;
        }
    );
    Object.keys(records).forEach(key => {
        let record = records[key];
        if (record.get('By') !== 'User') {
            console.log(`${record.get('Id')} is not a user intent`);
            return;
        }
        let templateId = record.get('Id');
        let childLinks = record.get('Children');

        let curChildren = [];
        if (childLinks) {
            childLinks.forEach(link => {
                if (records[link]) {
                    curChildren.push(records[link]);
                }
            });
        }

        if (curChildren.length === 0) {
            console.log(`${record.get('Id')} has no children`);
            return;
        } else {
            curChildren.reverse(); //airtable returns children in reverse order :/
        }
        let firstChild = curChildren[0];
        let firstChildTemplateId = firstChild.get('Id');
        let intentName = intentNameFromRecord(record);


        let conditionalResponses = [];
        let mergeStates = {};
        let anyDefault = false;
        let defaultResponseKey;
        let endSessionMap = {};
        let requestMergeState = record.get('Merge State') ? record.get('Merge State') : '{}';
        curChildren.forEach(child => {
            let filter = child.get('Filter State');
            let state = JSON.parse(child.get('Merge State') || '{}');
            let childId = child.get('Id');
            state['last-response-id'] = childId;
            if (filter) {
                conditionalResponses.push({
                    responseKey: childId,
                    stateMatch: rejson(filter)
                });
            } else {
                if (anyDefault) {
                    console.log(`WARNING: ${record.get('Id')} has multiple defaults - give all but one a filter state`);
                }
                defaultResponseKey = childId;

            }
            if (state) {
                mergeStates[childId] = json(state);
            }
            endSessionMap[childId] = !!child.get('End Session');
        });
        let requestType = record.get('Request Type');
        let requestSample = record.get('Voice Content').replace(/[^a-z0-9\-\s\{\}]/gi, '').trim();
        let requestSamples = [requestSample];
        let alternateIds;
        if (alternateIds = record.get('Alternates')) {

            console.log(alternateIds);
            alternateIds.forEach(id => {
                requestSamples.push(alternates[id].get('Content').replace(/[^a-z0-9\-\s\{\}]/gi, '').trim());
            })
        }

        let handlerName = `${intentName}Handler`;

        if (requestSample === '-unrecognizable-') {
            // almost there but filterstate needs to be made one ancestor back - jusst manually edited for now
            intentName = 'AMAZON.FallbackIntent';
            handlerName = 'FallbackIntentHandler';
            if (!fallbackHandlerGenerated) {
                intents.push({
                    name: intentName,
                    samples: []
                });
                fallbackHandlerGenerated = true;
            }
            fallbackResponses.push({
                responseKey: defaultResponseKey,
                stateMatch: json({'last-response-id': templateId.replace('-yes-request', '')})
            });
            fallbackResponses = fallbackResponses.concat(conditionalResponses);
            conditionalResponses = fallbackResponses.slice(0);
        } else if (requestSample === 'Yes') {
            intentName = 'AMAZON.YesIntent';
            handlerName = 'YesIntentHandler';
            if (!yesHandlerGenerated) {
                intents.push({
                    name: intentName,
                    slots: [],
                    samples: requestSamples
                });
                yesHandlerGenerated = true;
            }
            yesResponses.push({
                responseKey: defaultResponseKey,
                stateMatch: json({'last-response-id': templateId.replace('-yes-request', '')})
            });
            yesResponses = yesResponses.concat(conditionalResponses);
            conditionalResponses = yesResponses.slice(0);
        } else if (requestSample === 'No') {
            intentName = 'AMAZON.NoIntent';
            handlerName = 'NoIntentHandler';
            if (!noHandlerGenerated) {
                intents.push({
                    name: intentName,
                    slots: [],
                    samples: requestSamples
                });
                noHandlerGenerated = true;
            }
            noResponses.push({
                responseKey: defaultResponseKey,
                stateMatch: json({'last-response-id': templateId.replace('-no-request', '')})
            });
            noResponses = noResponses.concat(conditionalResponses);
            conditionalResponses = noResponses.slice(0);
        } else {
            if ((!requestType) || (requestType === 'Intent Request')) {
                intents.push({
                    name: intentName,
                    slots: extractSlots(record.get('Voice Content')),
                    samples: requestSamples
                });
            }
        }

        let handlerTypeDestination = intentName === 'Error' ? errorHandlers : requestHandlers;
        handlerTypeDestination[intentName] = `./${handlerName}`;

        let state = firstChild.get('Merge State') || '{}';
        // let requestTypeFunc = '';
        // if (requestType !== 'Intent Request') {
        //     requestTypeFunc = `static requestType() { return '${record.get('Request Type')}'; }`
        // }
        let handlerCode = ejs.render(
            handlerTemplate,
            {
                className: handlerName,
                requestType: requestType,
                intentName: intentName,
                defaultResponseKey: firstChildTemplateId,
                conditionalResponses: conditionalResponses,
                requestMergeState: rejson(requestMergeState),
                mergeStates: mergeStates,
                endSessionMap: endSessionMap
            }
        );

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        fs.writeFileSync(`${outputDir}/${handlerName}.js`, handlerCode);
    });
}

fetchFlows().
    then(() => {
    let indexCode = ejs.render(
        indexTemplate,
        {
            requestHandlers: requestHandlers,
            errorHandlers: errorHandlers
        }
    );

    fs.writeFileSync(outputIndex, indexCode);
    })
    .then(() => {
        fs.writeFileSync(outputModel, JSON.stringify(intents, null, 2));
    });



//TestClass.heyThere();
