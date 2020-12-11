# WunderGraph Hopper - Open Source GraphQL IDE

Built with:
- Monaco Editor (vscode)
- graphql.js
- Tailwind CSS

Roadmap:
- [x] Autocompletion
- [x] Introspection
- [x] Variables
- [ ] Headers
- [ ] GraphQL Schema Viewer
- [ ] Visual Schema Explorer
- [ ] Visual Query Builder

## Features

- Persisted Variables per Operation. Each Operation has its own Variables. Switching between Operations will always persist the Variables.
- Variable Extraction
- Works well without using a Mouse thanks to a rich set of Shortcuts

## Shortcuts

- CMD+Enter - Run currently selected Operation
- CMD+X - Extracts Variables at cursor position
- CTRL+Shift+F - Format Document
- OPTION+TAB - Switch between Operations and Variables

## Why

GraphiQL always felt a bit dated. GraphQL Playground didn't get maintained anymore. Both GraphiQL & Playground are not based on Monaco Editor (vscode).

Apollo started their efforts to build a GraphQL IDE on top of Monaco Editor. Unfortunately, their IDE is closed source, which makes it impossible for us to embed it into our own product.

We believe that a Open Source Monaco-based GraphQL IDE will help drive adoption and strengthen the ecosystem.  

# Extensibility

Styling implemented using Tailwind CSS which makes it very easy for you to customize styles.

Although our "Wrapper" around Monaco Editor is implemented using React, we built the core component, the controller, in Vanilla JS.
This makes it very easy to port WunderGraph Hopper to Vue, Angular or use it with Vanilla JS.

# Contributing

We're happy for every contribution. Please first open an issue, so we can have a discussion before you implement something we don't want to merge.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.


### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.
