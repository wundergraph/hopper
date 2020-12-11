# WunderGraph Hopper - Open Source GraphQL IDE

## Live Demo

https://hopper.wundergraph.com/

## Why WunderGraph Hopper?

GraphiQL always felt a bit dated. GraphQL Playground is not maintained anymore. Both GraphiQL & Playground are not based on Monaco Editor (vscode).

Apollo started their efforts to build a GraphQL IDE on top of Monaco Editor. Unfortunately, their IDE is closed source. This makes it impossible for us to embed it into our own product.

We believe that an Open Source Monaco-based GraphQL IDE will help drive adoption and strengthen the ecosystem.

## Roadmap
- [x] Autocompletion
- [x] Introspection
- [x] Variables
- [ ] Headers
- [ ] GraphQL Schema Viewer
- [ ] Visual Schema Explorer
- [ ] Visual Query Builder

## What is WunderGraph?

With WunderGraph, you use GraphQL during development and REST in production without even noticing.

The developer experience of GraphQL combined with the performance & cacheability of REST.

We support GraphQL, GraphQL Federation, GraphQL Schema Stitching & REST as upstreams, OIDC for Authentication and give you HTTP spec compliant Caching by default.

We're planning to support SOAP, ODATA & gRPC as upstreams.

Our hyperfast GraphQL Engine uses Compiled Queries. Early tests suggest that we're ~30-150x faster than the Apollo Federation Gateway. Our Engine supports @defer, @stream and Subscriptions for an optimal user experience.

But performance is not everything. Compiling Queries in production also eliminates a lot of threats like traversal attacks or DOS by using complex Queries, making your GraphQL journey even more secure.

WunderGraph lets you worry about fewer things, so you can focus on building valuable features.

Check out more at: https://wundergraph.com

## Built with

- Monaco Editor (vscode)
- graphql.js
- Tailwind CSS

## Features

- Persisted Variables per Operation. Each Operation has its own Variables. Switching between Operations will always persist the Variables.
- Variable Extraction
- Works well without using a Mouse thanks to a rich set of Shortcuts

## Shortcuts

- CMD+Enter - Run currently selected Operation
- CMD+X - Extracts Variables at cursor position
- CTRL+Shift+F - Format Document
- OPTION+TAB - Switch between Operations and Variables  

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
