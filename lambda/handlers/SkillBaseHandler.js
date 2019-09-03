const appUtils = require('../lib/util.js');
const BaseHandler = require('voice-tools/lib/platform/alexa/handlers/BaseHandler');
const config = require('../config/config');

class SkillBaseHandler extends BaseHandler {
    constructor(handlerInput, config, logInstance) {
        super(handlerInput, config, logInstance);
        this.appUtils = appUtils;
    }
}
module.exports = SkillBaseHandler;