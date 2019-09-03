const va = require("virtual-alexa");
const chai = require('chai');
const alexa = va.VirtualAlexa.Builder()
    .handler("skill/index.handler") // Lambda function file and name
    .interactionModelFile("test/setup/models/en-US.json") // Path to interaction model file
    .create();
const testData = {};
module.exports = {
    assert: chai.assert,
    alexa: alexa,
    data: testData
}