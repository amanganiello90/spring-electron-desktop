# Spring electron desktop

This is a project that run a spring boot jar (**app.jar**) in electron.

You can view the server log in electron window, pressing a key from your keyboard (defined in **main.js**).

# Prerequisites

* Install [node.js](https://nodejs.org/dist/v14.18.0/node-v14.18.0-x86.msi)
* Install a valid **JRE** (Java)
* Generate **node_modules** on project with:

```
npm install
```

## Electron

All generated packages will be under **out** folder

### Run client electron in live mode

```
npm run electron
```
### Build an electron package for your operating sistem

```
npm run package
```

### Build an exe package for windows

```
npm run win
```

### Build a zip of mac dmg package

```
npm run make-mac
```

### publish exe on github

Change the value of repository key and set your **GH_TOKEN** in this package.json, specifying the github repo to publish the package. After execute:

```
npm run publish
```


In the end, confirm the release draft on the github repo selected previously.


