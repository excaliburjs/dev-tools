# ⚠️ Excalibur dev tools are moving to a browser extension ⚠️

Please visit:
* Source code: https://github.com/excaliburjs/excalibur-extension/
* Official Chrome Plugin: https://chromewebstore.google.com/detail/excalibur-dev-tools/dinddaeielhddflijbbcmpefamfffekc


## Excalibur Dev Tools

This is a dev tool to help you debug your game written in excalibur.

This tool allows you to see information about the engine, currentScene, camera, clock, entities, and more!

UI is built using [tweakpane](https://cocopon.github.io/tweakpane/)

### Using dev tools in your excalibur game!

1. Install using npm

```
> npm install @excaliburjs/dev-tools
```

2. Inside your game code pass your game to the devtool

```typescript
const game = new ex.Engine({...});
const devtool = new DevTool(game);
```

3. Voila!

<img width="1153" alt="image" src="https://user-images.githubusercontent.com/612071/150462738-433536d9-28b0-486c-b5bb-8e8b4e2526fc.png">

### Standalone Script File

In your HTML file, add a reference `devtools-tiled.min.js` in your page:
```html
<script type="text/javascript" src="https://unpkg.com/excalibur"></script>
<script type="text/javascript" src="https://unpkg.com/@excaliburjs/dev-tools"></script>
```

and then you can use it like this:

```js
const game = new ex.Engine({...});
const devtool = new ex.DevTools.DevTool(game);
```
The dist uses a UMD build and will attach itself to the `ex.DevTools.DevTool` global if running in the browser standalone.

### Building & Running Locally

Install node & npm 

* `npm install`
* `npm run start`
