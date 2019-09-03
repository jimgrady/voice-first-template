const fs = require('fs');
const envType = process.env.ENV_TYPE || 'dev_skill';
const language = 'en-US';
module.exports = {
    invocationName: process.env.INVOCATION_NAME || 'Invocation Name',
    language: 'en-US',
    envType: envType,
    dbType: process.env.DB_TYPE || 'remote',
    airtableApiKey: process.env.AIRTABLE_API_KEY,
    airtableBaseId: process.env.AIRTABLE_BASE_ID,
    airtableUiTable: process.env.AIRTABLE_UI_TABLE ? process.env.AIRTABLE_UI_TABLE : 'Flows',
    airtableUiStringsView: process.env.AIRTABLE_UI_STRINGS_VIEW ? process.env.AIRTABLE_UI_STRINGS_VIEW : 'Response Content',
    airtableUiFlowsView: process.env.AIRTABLE_UI_FLOWS_VIEW ? process.env.AIRTABLE_UI_FLOWS_VIEW : 'All',
    airtableDevPrefix: '',
    userTableName: process.env.USER_TABLE_NAME || 'UserTable',
    isDev: envType === 'dev_skill',
    logger: require('voice-tools/lib/logger/ConsoleLogger.js'),
    uiTemplates: JSON.parse(fs.readFileSync(`${__dirname}/../assets/${language}/strings.json`)),
    skillClientId: envType === 'prod_skill' ? process.env.PROD_SKILL_CLIENT_ID : process.env.DEV_SKILL_CLIENT_ID,
    skillClientSecret: envType === 'prod_skill' ? process.env.PROD_SKILL_CLIENT_SECRET : process.env.DEV_SKILL_CLIENT_SECRET,
    apiBaseUrl: '',
    defaultState: {
        "lifecycle": "new",
        "account-linked": false
    }
};