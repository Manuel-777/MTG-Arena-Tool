Modified version of the original script!
================

Proto2TypeScript
================

This tool generate TypeScript definitions for your Protocol Buffers models, when you use the excellent [ProtoBuf.js](https://github.com/dcodeIO/ProtoBuf.js/) library.

UPDATES -- Difference from the original
================
[Original tool](https://github.com/SINTEF-9012/Proto2TypeScript) doesn't seem supported anymore.

#### My updates:
* Made the package globally installable
* Converted the tool code from Typescript to Javascript as the build process for NPM package with Typescript
  was not there at all
* Fixed some bugs
* Published on NPM

Also, the build process was a mess. I fixed those. But I don't even send a PR, because I changed a lot of stuff.



### Installation
```sh
npm install proto2typescript -g
```

### Usage
```sh
# Parse and convert the proto file to json using pbjs (from ProtoBuf.js)
pbjs model.proto > model.json

# Convert the model to TypeScript definitions
proto2typescript --file model.json > model.d.ts
```

### Options
```
Options:
  -f, --file              The JSON file                                       [required]
  -c, --camelCaseGetSet   Generate getter and setters in camel case notation  [default: true]
  -u, --underscoreGetSet  Generate getter and setters in underscore notation  [default: false]
  -p, --properties        Generate properties                                 [default: true]
```

### Gulp
See <https://github.com/aliok/websocket-protobufs-ts-experiments> for Gulp integration.

### Why ?

Because intelligent code completion is cool :-)

![](http://i.imgur.com/evVnEM5.png "Example in sublime text")

### Requirements

It is a Node.js project. The sourcecode is written in TypeScript, but the JavaScript output is present in the repository.

If you want to run the tests, you need bash, mocha and typescript.

```sh
npm install mocha -g
npm install typescript -g
```

In order to run tests:

```sh
./runTests.sh
```

### Acknowledgements

This code is developed in context of the [BRIDGE](http://www.bridgeproject.eu/en) project.

### Licence

The source code of this tool is licenced under the MIT License.
