node ..\..\node_modules\protobufjs\bin\pbjs messages.proto > model.json
node proto2typescript/index.js -f model.json > GreTypes.ts