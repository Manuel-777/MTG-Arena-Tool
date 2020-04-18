# stdout makes a mess with the file?
node ..\..\node_modules\protobufjs\bin\pbjs messages.proto > model.json
node proto2typescript/index.js