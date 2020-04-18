node ..\..\node_modules\protobufjs\bin\pbjs messages.proto > model.json
node proto2typescript/bin/proto2typescript-bin.js -f model.json > GreTypes.ts