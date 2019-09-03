# Alexa Skill

## Initial Setup
Update strings.json and config.js with local values.
Set environment variables not hard-coded in config.js.

## How to Deploy
1. cd scripts
2. ./build.sh
3. the build will be saved at build/lambda.zip.
Upload this to your lambda function.

Only files under the lambda directory are part of the
build. The other directories are for support, testing, or reference.

The model under models/en-US.json is only for reference and running tests.
The actual current model is the one you see from the alexa developer
console when you select "JSON Editor."